-- ============================================================
-- MIGRATION: Standardize all slots to 60 minutes (1 hour)
-- This migration:
-- 1. Updates generate_provider_time_slots_for_listing to always use 60 minutes
-- 2. Cleans up future non-1-hour slots that are not reserved/blocked
-- 3. Regenerates slots using maintain_future_slots()
-- ============================================================

-- STEP 1: Update the slot generation function to ALWAYS use 60 minutes
CREATE OR REPLACE FUNCTION public.generate_provider_time_slots_for_listing(
  p_provider_id uuid,
  p_listing_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_current_date date;
  v_day_name text;
  v_slot_start time;
  v_slot_end time;
  v_slot_datetime_start timestamptz;
  v_slot_datetime_end timestamptz;
  v_availability jsonb;
  v_day_config jsonb;
  v_time_slot jsonb;
  v_slot_duration_minutes integer := 60; -- STANDARDIZED: Always 60 minutes
  v_slots_inserted integer := 0;
BEGIN
  -- Validate auth
  IF auth.uid() IS NULL AND current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Set date range: today + 60 days
  v_start_date := CURRENT_DATE;
  v_end_date := CURRENT_DATE + INTERVAL '60 days';
  
  -- Get availability config from listing
  SELECT availability INTO v_availability
  FROM listings
  WHERE id = p_listing_id AND provider_id = p_provider_id;
  
  IF v_availability IS NULL THEN
    RAISE NOTICE 'No availability config for listing %', p_listing_id;
    RETURN;
  END IF;
  
  -- Iterate through each day in range
  v_current_date := v_start_date;
  WHILE v_current_date <= v_end_date LOOP
    -- Map day number to name (0=Sunday, 1=Monday, etc.)
    v_day_name := CASE EXTRACT(DOW FROM v_current_date)
      WHEN 0 THEN 'sunday'
      WHEN 1 THEN 'monday'
      WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday'
      WHEN 5 THEN 'friday'
      WHEN 6 THEN 'saturday'
    END;
    
    -- Get day configuration
    v_day_config := v_availability->v_day_name;
    
    -- Check if day is enabled and has time slots
    IF v_day_config IS NOT NULL 
       AND (v_day_config->>'enabled')::boolean = true 
       AND v_day_config->'timeSlots' IS NOT NULL 
       AND jsonb_array_length(v_day_config->'timeSlots') > 0 THEN
      
      -- Iterate through each time slot in the day
      FOR v_time_slot IN SELECT * FROM jsonb_array_elements(v_day_config->'timeSlots')
      LOOP
        v_slot_start := (v_time_slot->>'start')::time;
        
        -- Generate slots in 60-minute intervals until end time
        WHILE v_slot_start < (v_time_slot->>'end')::time LOOP
          v_slot_end := v_slot_start + (v_slot_duration_minutes || ' minutes')::interval;
          
          -- Don't create slot if it exceeds the end time
          IF v_slot_end > (v_time_slot->>'end')::time THEN
            EXIT;
          END IF;
          
          -- Create timestamps with timezone
          v_slot_datetime_start := v_current_date + v_slot_start;
          v_slot_datetime_end := v_current_date + v_slot_end;
          
          -- Insert slot (ignore conflicts on existing slots)
          INSERT INTO provider_time_slots (
            provider_id,
            listing_id,
            slot_date,
            start_time,
            end_time,
            slot_datetime_start,
            slot_datetime_end,
            is_available,
            is_reserved,
            slot_type
          ) VALUES (
            p_provider_id,
            p_listing_id,
            v_current_date,
            v_slot_start,
            v_slot_end,
            v_slot_datetime_start,
            v_slot_datetime_end,
            true,
            false,
            'generated'
          )
          ON CONFLICT ON CONSTRAINT unique_provider_slot DO NOTHING;
          
          v_slots_inserted := v_slots_inserted + 1;
          v_slot_start := v_slot_end;
        END LOOP;
      END LOOP;
    END IF;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RAISE NOTICE 'Generated % slots for listing %', v_slots_inserted, p_listing_id;
END;
$$;

-- STEP 2: Update the trigger function to always use 60 minutes
CREATE OR REPLACE FUNCTION public.auto_generate_slots_for_new_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- STANDARDIZED: All slots are now 60 minutes
  PERFORM generate_provider_time_slots_for_listing(NEW.provider_id, NEW.id);
  RETURN NEW;
END;
$$;

-- STEP 3: Clean up future non-1-hour slots that are NOT reserved and NOT blocked
-- This removes the mixed 30-minute slots while preserving reservations and manual blocks
DELETE FROM provider_time_slots
WHERE slot_date >= CURRENT_DATE
  AND is_reserved = false
  AND (slot_type IS NULL OR slot_type != 'manually_blocked')
  AND recurring_blocked = false
  AND (slot_datetime_end - slot_datetime_start) != interval '1 hour';

-- STEP 4: Update all listings to have slot_size = 60 (before we drop the column)
UPDATE listings SET slot_size = 60 WHERE slot_size != 60;

-- STEP 5: Regenerate missing 1-hour slots for all active listings
-- This will create uniform 1-hour slots using the updated function
SELECT maintain_future_slots();