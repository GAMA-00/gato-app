-- Fix timezone interpretation in slot generation
-- The function was interpreting availability times as UTC instead of local time (America/Mexico_City)

-- 1. Drop and recreate function with timezone fix
DROP FUNCTION IF EXISTS public.generate_provider_time_slots_for_listing(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.generate_provider_time_slots_for_listing(
  p_provider_id uuid,
  p_listing_id uuid,
  p_days_ahead integer DEFAULT 60
)
RETURNS integer AS $$
DECLARE
  v_timezone text := 'America/Mexico_City';  -- System timezone
  v_slot_size integer := 30;  -- Fixed 30-minute slots
  v_provider_avail RECORD;
  v_current_date date;
  v_end_date date;
  v_day_of_week integer;
  v_slot_start timestamp with time zone;
  v_slot_end timestamp with time zone;
  v_window_end_tz timestamp with time zone;
  v_slots_created integer := 0;
  v_window_start time;
  v_window_end time;
  v_local_start_time time;
  v_local_end_time time;
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

      -- CRITICAL FIX: Interpret time as LOCAL time, not UTC
      -- This converts "07:00" in Mexico City to the correct UTC timestamp
      v_slot_start := (v_current_date + v_window_start) AT TIME ZONE v_timezone;
      v_window_end_tz := (v_current_date + v_window_end) AT TIME ZONE v_timezone;
      
      WHILE (v_slot_start + (v_slot_size || ' minutes')::interval) <= v_window_end_tz LOOP
        v_slot_end := v_slot_start + (v_slot_size || ' minutes')::interval;

        IF v_slot_start > NOW() THEN
          -- Extract local time for start_time/end_time columns
          v_local_start_time := (v_slot_start AT TIME ZONE v_timezone)::time;
          v_local_end_time := (v_slot_end AT TIME ZONE v_timezone)::time;
          
          INSERT INTO provider_time_slots (
            provider_id, listing_id, slot_date, start_time, end_time,
            slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type
          )
          VALUES (
            p_provider_id, p_listing_id, v_current_date,
            v_local_start_time,  -- Local time
            v_local_end_time,    -- Local time
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

-- 2. Delete future unreserved generated slots (preserve reservations)
DELETE FROM provider_time_slots
WHERE slot_date >= CURRENT_DATE
  AND is_reserved = false
  AND slot_type = 'generated';

-- 3. Regenerate slots for all active listings
DO $regen$
DECLARE
  v_listing RECORD;
  v_count integer;
BEGIN
  FOR v_listing IN 
    SELECT l.id as listing_id, l.provider_id 
    FROM listings l WHERE l.is_active = true
  LOOP
    SELECT public.generate_provider_time_slots_for_listing(
      v_listing.provider_id, v_listing.listing_id, 60
    ) INTO v_count;
    RAISE NOTICE 'Generated % slots for listing %', v_count, v_listing.listing_id;
  END LOOP;
END;
$regen$;