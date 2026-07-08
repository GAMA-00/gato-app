-- Create function to diagnose and fix slot availability issues
CREATE OR REPLACE FUNCTION public.diagnose_and_fix_slot_availability(
  p_listing_id UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  action TEXT,
  details TEXT,
  slots_before INTEGER,
  slots_after INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  listing_record RECORD;
  slots_before_count INTEGER;
  slots_after_count INTEGER;
  day_of_week_num INTEGER;
  day_name TEXT;
  availability_data JSONB;
  day_availability JSONB;
  time_slot JSONB;
  slot_start_time TIME;
  slot_end_time TIME;
  iter_time TIME;
  slot_datetime_start TIMESTAMP WITH TIME ZONE;
  slot_datetime_end TIMESTAMP WITH TIME ZONE;
  service_duration INTEGER;
  slots_created INTEGER := 0;
BEGIN
  -- Get listing information
  SELECT * INTO listing_record
  FROM listings 
  WHERE id = p_listing_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'ERROR'::TEXT, 'Listing not found or inactive'::TEXT, 0, 0;
    RETURN;
  END IF;
  
  service_duration := listing_record.standard_duration;
  availability_data := listing_record.availability;
  
  -- Get day of week for target date
  day_of_week_num := EXTRACT(DOW FROM p_target_date);
  day_name := CASE day_of_week_num
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;
  
  -- Count existing slots for this date
  SELECT COUNT(*) INTO slots_before_count
  FROM provider_time_slots
  WHERE provider_id = listing_record.provider_id
    AND listing_id = p_listing_id
    AND slot_date = p_target_date;
  
  RETURN QUERY SELECT 'DIAGNOSIS'::TEXT, 
    format('Target date: %s (%s), Service duration: %s minutes, Existing slots: %s', 
           p_target_date, day_name, service_duration, slots_before_count)::TEXT, 
    slots_before_count, 0;
  
  -- Check if day is enabled in availability
  day_availability := availability_data->day_name;
  
  IF day_availability IS NULL OR (day_availability->>'enabled')::BOOLEAN != true THEN
    RETURN QUERY SELECT 'ERROR'::TEXT, 
      format('Day %s is not enabled in provider availability', day_name)::TEXT, 
      slots_before_count, slots_before_count;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 'INFO'::TEXT, 
    format('Day availability config: %s', day_availability::TEXT)::TEXT, 
    0, 0;
  
  -- Delete existing unreserved slots for this date to regenerate cleanly
  DELETE FROM provider_time_slots
  WHERE provider_id = listing_record.provider_id
    AND listing_id = p_listing_id
    AND slot_date = p_target_date
    AND is_reserved = false;
  
  -- Generate new slots based on availability configuration
  FOR time_slot IN SELECT * FROM jsonb_array_elements(day_availability->'timeSlots')
  LOOP
    slot_start_time := (time_slot->>'startTime')::TIME;
    slot_end_time := (time_slot->>'endTime')::TIME;
    
    RETURN QUERY SELECT 'TIME_SLOT'::TEXT, 
      format('Processing time slot: %s to %s', slot_start_time, slot_end_time)::TEXT, 
      0, 0;
    
    -- Generate slots within this time range
    iter_time := slot_start_time;
    
    WHILE iter_time + (service_duration || ' minutes')::INTERVAL <= slot_end_time LOOP
      slot_datetime_start := (p_target_date + iter_time) AT TIME ZONE 'America/Costa_Rica';
      slot_datetime_end := (p_target_date + iter_time + (service_duration || ' minutes')::INTERVAL) AT TIME ZONE 'America/Costa_Rica';
      
      -- Only create slots that are in the future
      IF slot_datetime_start > NOW() THEN
        -- Check if slot conflicts with existing appointments
        IF NOT EXISTS (
          SELECT 1 FROM appointments
          WHERE provider_id = listing_record.provider_id
            AND start_time < slot_datetime_end
            AND end_time > slot_datetime_start
            AND status IN ('confirmed', 'pending')
        ) THEN
          -- Insert the slot as available
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
            recurring_blocked
          ) VALUES (
            listing_record.provider_id,
            p_listing_id,
            p_target_date,
            iter_time,
            iter_time + (service_duration || ' minutes')::INTERVAL,
            slot_datetime_start,
            slot_datetime_end,
            true,
            false,
            false
          ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
          
          slots_created := slots_created + 1;
          
        ELSE
          -- Mark slot as reserved due to existing appointment
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
            recurring_blocked
          ) VALUES (
            listing_record.provider_id,
            p_listing_id,
            p_target_date,
            iter_time,
            iter_time + (service_duration || ' minutes')::INTERVAL,
            slot_datetime_start,
            slot_datetime_end,
            false,
            true,
            false
          ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
          
        END IF;
      END IF;
      
      -- Move to next slot
      iter_time := iter_time + (service_duration || ' minutes')::INTERVAL;
    END LOOP;
  END LOOP;
  
  -- Count slots after regeneration
  SELECT COUNT(*) INTO slots_after_count
  FROM provider_time_slots
  WHERE provider_id = listing_record.provider_id
    AND listing_id = p_listing_id
    AND slot_date = p_target_date;
  
  RETURN QUERY SELECT 'SUCCESS'::TEXT, 
    format('Regenerated slots for %s. Created %s new available slots.', p_target_date, slots_created)::TEXT, 
    slots_before_count, slots_after_count;
  
  -- Return final slot status
  RETURN QUERY 
    SELECT 'FINAL_STATUS'::TEXT,
           format('Available: %s, Reserved: %s, Total: %s', 
                  (SELECT COUNT(*) FROM provider_time_slots 
                   WHERE provider_id = listing_record.provider_id 
                   AND listing_id = p_listing_id 
                   AND slot_date = p_target_date 
                   AND is_available = true),
                  (SELECT COUNT(*) FROM provider_time_slots 
                   WHERE provider_id = listing_record.provider_id 
                   AND listing_id = p_listing_id 
                   AND slot_date = p_target_date 
                   AND is_reserved = true),
                  slots_after_count)::TEXT,
           0, slots_after_count;
END;
$function$;

-- Execute the diagnosis and fix for Friday August 8th, 2025
SELECT * FROM diagnose_and_fix_slot_availability(
  'f8e8554c-a1a3-4163-913f-dbf99d0cd812'::UUID,
  '2025-08-08'::DATE
);