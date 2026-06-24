-- =====================================================
-- MIGRATION: Fix slot generation and regenerate 30-min slots
-- =====================================================

-- 1. Update mark_slot_as_reserved for multi-slot support
CREATE OR REPLACE FUNCTION public.mark_slot_as_reserved()
RETURNS trigger AS $$
BEGIN
  UPDATE provider_time_slots
  SET is_reserved = true, is_available = false
  WHERE provider_id = NEW.provider_id
    AND listing_id = NEW.listing_id
    AND slot_datetime_start >= NEW.start_time
    AND slot_datetime_start < NEW.end_time;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update release_slot_on_cancellation for multi-slot support
CREATE OR REPLACE FUNCTION public.release_slot_on_cancellation()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'rejected') 
     AND OLD.status NOT IN ('cancelled', 'rejected') THEN
    UPDATE provider_time_slots
    SET is_reserved = false, is_available = true
    WHERE provider_id = NEW.provider_id
      AND listing_id = NEW.listing_id
      AND slot_datetime_start >= NEW.start_time
      AND slot_datetime_start < NEW.end_time
      AND slot_type IN ('reserved', 'generated');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Drop and recreate generate_provider_time_slots_for_listing
DROP FUNCTION IF EXISTS public.generate_provider_time_slots_for_listing(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.generate_provider_time_slots_for_listing(uuid, uuid);

CREATE FUNCTION public.generate_provider_time_slots_for_listing(
  p_provider_id uuid,
  p_listing_id uuid,
  p_days_ahead integer DEFAULT 60
)
RETURNS integer AS $$
DECLARE
  v_slot_size integer := 30;
  v_provider_avail RECORD;
  v_current_date date;
  v_end_date date;
  v_day_of_week integer;
  v_slot_start timestamp with time zone;
  v_slot_end timestamp with time zone;
  v_slots_created integer := 0;
  v_window_start time;
  v_window_end time;
BEGIN
  v_current_date := CURRENT_DATE;
  v_end_date := v_current_date + p_days_ahead;

  WHILE v_current_date <= v_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::integer;

    FOR v_provider_avail IN
      SELECT start_time, end_time
      FROM provider_availability
      WHERE provider_id = p_provider_id
        AND day_of_week = v_day_of_week
        AND is_active = true
    LOOP
      v_window_start := v_provider_avail.start_time;
      v_window_end := v_provider_avail.end_time;
      v_slot_start := v_current_date + v_window_start;
      
      WHILE (v_slot_start + (v_slot_size || ' minutes')::interval) <= (v_current_date + v_window_end) LOOP
        v_slot_end := v_slot_start + (v_slot_size || ' minutes')::interval;

        IF v_slot_start > NOW() THEN
          INSERT INTO provider_time_slots (
            provider_id, listing_id, slot_date, start_time, end_time,
            slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type
          )
          VALUES (
            p_provider_id, p_listing_id, v_current_date,
            v_window_start + ((EXTRACT(EPOCH FROM (v_slot_start - (v_current_date + v_window_start))) / 60)::integer || ' minutes')::interval,
            v_window_start + ((EXTRACT(EPOCH FROM (v_slot_end - (v_current_date + v_window_start))) / 60)::integer || ' minutes')::interval,
            v_slot_start, v_slot_end, true, false, 'generated'
          )
          ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
          v_slots_created := v_slots_created + 1;
        END IF;

        v_slot_start := v_slot_end;
      END LOOP;
    END LOOP;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN v_slots_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Drop and recreate maintain_future_slots
DROP FUNCTION IF EXISTS public.maintain_future_slots();

CREATE FUNCTION public.maintain_future_slots()
RETURNS void AS $$
DECLARE
  v_listing RECORD;
  v_slots_created integer;
BEGIN
  FOR v_listing IN 
    SELECT l.id as listing_id, l.provider_id 
    FROM listings l WHERE l.is_active = true
  LOOP
    SELECT generate_provider_time_slots_for_listing(
      v_listing.provider_id, v_listing.listing_id, 60
    ) INTO v_slots_created;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Free orphaned slots from cancelled appointments
UPDATE provider_time_slots pts
SET is_reserved = false, is_available = true
WHERE is_reserved = true
  AND slot_type IN ('reserved', 'generated')
  AND slot_date >= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.provider_id = pts.provider_id
      AND a.listing_id = pts.listing_id
      AND a.status IN ('pending', 'confirmed')
      AND pts.slot_datetime_start >= a.start_time
      AND pts.slot_datetime_start < a.end_time
  );

-- 6. Delete future generated slots (preserving manual blocks)
DELETE FROM provider_time_slots
WHERE slot_date >= CURRENT_DATE
  AND is_reserved = false
  AND slot_type = 'generated';

-- 7. Regenerate slots for all active listings
DO $regen$
DECLARE
  v_listing RECORD;
  v_slots_created integer;
BEGIN
  FOR v_listing IN 
    SELECT l.id as listing_id, l.provider_id 
    FROM listings l WHERE l.is_active = true
  LOOP
    SELECT public.generate_provider_time_slots_for_listing(
      v_listing.provider_id, v_listing.listing_id, 60
    ) INTO v_slots_created;
  END LOOP;
END;
$regen$;