-- Fix triweekly and other recurrence slot blocking logic (corrected date arithmetic)

-- Create a SQL function to calculate next occurrence (similar to JS version)
CREATE OR REPLACE FUNCTION public.calculate_next_occurrence_sql(
  original_date DATE,
  recurrence_type TEXT,
  reference_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  next_date DATE;
  day_of_week INTEGER;
  weeks_diff INTEGER;
  remainder INTEGER;
BEGIN
  CASE recurrence_type
    WHEN 'weekly' THEN
      -- Find next weekly occurrence
      day_of_week := EXTRACT(DOW FROM original_date);
      next_date := reference_date;
      
      -- Find next occurrence of the same day of week
      WHILE EXTRACT(DOW FROM next_date) != day_of_week OR next_date <= reference_date LOOP
        next_date := next_date + 1;
      END LOOP;
      
    WHEN 'biweekly' THEN
      -- Find next biweekly occurrence (every 14 days)
      day_of_week := EXTRACT(DOW FROM original_date);
      next_date := reference_date;
      
      -- Find next occurrence of the same day of week
      WHILE EXTRACT(DOW FROM next_date) != day_of_week LOOP
        next_date := next_date + 1;
      END LOOP;
      
      -- Check if it falls on the correct biweekly cycle
      weeks_diff := (next_date - original_date) / 7;
      IF weeks_diff % 2 != 0 THEN
        next_date := next_date + 7;
      END IF;
      
      -- If still not in future, advance by 14 days
      IF next_date <= reference_date THEN
        next_date := next_date + 14;
      END IF;
      
    WHEN 'triweekly' THEN
      -- Find next triweekly occurrence (every 21 days)
      day_of_week := EXTRACT(DOW FROM original_date);
      next_date := reference_date;
      
      -- Find next occurrence of the same day of week
      WHILE EXTRACT(DOW FROM next_date) != day_of_week LOOP
        next_date := next_date + 1;
      END LOOP;
      
      -- Check if it falls on the correct triweekly cycle (every 3 weeks)
      weeks_diff := (next_date - original_date) / 7;
      remainder := weeks_diff % 3;
      IF remainder != 0 THEN
        next_date := next_date + (3 - remainder) * 7;
      END IF;
      
      -- If still not in future, advance by 21 days
      IF next_date <= reference_date THEN
        next_date := next_date + 21;
      END IF;
      
    WHEN 'monthly' THEN
      -- Monthly: same day of month, next month if needed
      next_date := DATE_TRUNC('month', reference_date) + 
                   (EXTRACT(DAY FROM original_date)::INTEGER - 1) * INTERVAL '1 day';
      
      -- If this month's date has passed, go to next month
      IF next_date <= reference_date THEN
        next_date := DATE_TRUNC('month', reference_date + INTERVAL '1 month') + 
                     (EXTRACT(DAY FROM original_date)::INTEGER - 1) * INTERVAL '1 day';
      END IF;
      
    ELSE
      -- Default: return original date
      next_date := original_date;
  END CASE;
  
  RETURN next_date;
END;
$$;

-- Fixed version of block_recurring_slots_for_appointment
CREATE OR REPLACE FUNCTION public.block_recurring_slots_for_appointment(
  p_appointment_id uuid, 
  p_months_ahead integer DEFAULT 12
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  appointment_record appointments%ROWTYPE;
  slots_blocked INTEGER := 0;
  iter_date DATE;
  end_date DATE;
  slot_start_datetime TIMESTAMP WITH TIME ZONE;
  slot_end_datetime TIMESTAMP WITH TIME ZONE;
  service_duration INTEGER;
  recurrence_interval INTEGER;
  original_appointment_date DATE;
  is_valid_occurrence BOOLEAN;
  weeks_from_original INTEGER;
  remainder INTEGER;
BEGIN
  -- Get the appointment details
  SELECT * INTO appointment_record 
  FROM appointments 
  WHERE id = p_appointment_id 
  AND recurrence IS NOT NULL 
  AND recurrence != 'none';
  
  IF NOT FOUND THEN
    RAISE LOG 'Appointment not found or not recurring: %', p_appointment_id;
    RETURN 0;
  END IF;
  
  -- Get service duration from listing
  SELECT standard_duration INTO service_duration
  FROM listings 
  WHERE id = appointment_record.listing_id;
  
  IF service_duration IS NULL THEN
    RAISE LOG 'Could not find service duration for listing: %', appointment_record.listing_id;
    RETURN 0;
  END IF;
  
  original_appointment_date := appointment_record.start_time::date;
  
  -- Calculate the FIRST future occurrence using the correct logic
  iter_date := calculate_next_occurrence_sql(
    original_appointment_date, 
    appointment_record.recurrence, 
    CURRENT_DATE
  );
  
  end_date := CURRENT_DATE + (p_months_ahead * 30);
  
  -- Determine recurrence interval in days
  recurrence_interval := CASE appointment_record.recurrence
    WHEN 'weekly' THEN 7
    WHEN 'biweekly' THEN 14
    WHEN 'triweekly' THEN 21
    WHEN 'monthly' THEN 30
    ELSE 7
  END;
  
  RAISE LOG 'Blocking recurring slots for appointment % with recurrence % starting from % (original: %)', 
    p_appointment_id, appointment_record.recurrence, iter_date, original_appointment_date;
  
  -- Block slots at the correct recurring interval
  WHILE iter_date <= end_date LOOP
    -- Calculate the slot datetime for this iteration
    slot_start_datetime := iter_date + (appointment_record.start_time::time);
    slot_end_datetime := slot_start_datetime + (service_duration || ' minutes')::interval;
    
    -- For monthly recurrence, use precise calculation
    IF appointment_record.recurrence = 'monthly' THEN
      -- Ensure we're on the same day of month as original appointment
      IF EXTRACT(DAY FROM iter_date) != EXTRACT(DAY FROM original_appointment_date) THEN
        -- Skip this iteration and recalculate for next month
        iter_date := calculate_next_occurrence_sql(
          original_appointment_date, 
          appointment_record.recurrence, 
          iter_date
        );
        CONTINUE;
      END IF;
    END IF;
    
    -- Validate that this date follows the correct pattern
    is_valid_occurrence := false;
    
    CASE appointment_record.recurrence
      WHEN 'weekly' THEN
        is_valid_occurrence := EXTRACT(DOW FROM iter_date) = EXTRACT(DOW FROM original_appointment_date);
      WHEN 'biweekly' THEN
        weeks_from_original := (iter_date - original_appointment_date) / 7;
        is_valid_occurrence := (weeks_from_original % 2 = 0) AND 
                              EXTRACT(DOW FROM iter_date) = EXTRACT(DOW FROM original_appointment_date);
      WHEN 'triweekly' THEN
        weeks_from_original := (iter_date - original_appointment_date) / 7;
        is_valid_occurrence := (weeks_from_original % 3 = 0) AND 
                              EXTRACT(DOW FROM iter_date) = EXTRACT(DOW FROM original_appointment_date);
      WHEN 'monthly' THEN
        is_valid_occurrence := EXTRACT(DAY FROM iter_date) = EXTRACT(DAY FROM original_appointment_date);
      ELSE
        is_valid_occurrence := true;
    END CASE;
    
    IF NOT is_valid_occurrence THEN
      RAISE LOG 'Skipping invalid occurrence date % for pattern %', iter_date, appointment_record.recurrence;
      iter_date := iter_date + recurrence_interval;
      CONTINUE;
    END IF;
    
    -- Insert or update the slot to mark it as blocked
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
      recurring_blocked,
      blocked_until
    ) VALUES (
      appointment_record.provider_id,
      appointment_record.listing_id,
      iter_date,
      appointment_record.start_time::time,
      slot_end_datetime::time,
      slot_start_datetime,
      slot_end_datetime,
      false, -- Not available
      true,  -- Reserved
      true,  -- Blocked by recurring appointment
      end_date
    ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
    DO UPDATE SET
      is_available = false,
      is_reserved = true,
      recurring_blocked = true,
      blocked_until = end_date;
    
    slots_blocked := slots_blocked + 1;
    
    RAISE LOG 'Blocked slot on % at % (weeks from original: %)', 
      iter_date, appointment_record.start_time::time,
      (iter_date - original_appointment_date) / 7;
    
    -- Move to next occurrence using the proper interval
    iter_date := iter_date + recurrence_interval;
  END LOOP;
  
  RAISE LOG 'Blocked % recurring slots for appointment %', slots_blocked, p_appointment_id;
  RETURN slots_blocked;
END;
$$;

-- Function to clean incorrectly blocked slots and re-block with correct logic
CREATE OR REPLACE FUNCTION public.fix_triweekly_blocked_slots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  appointment_record RECORD;
  slots_fixed INTEGER := 0;
  total_fixed INTEGER := 0;
BEGIN
  RAISE LOG 'Starting fix for triweekly blocked slots...';
  
  -- Find all triweekly appointments that might have incorrectly blocked slots
  FOR appointment_record IN 
    SELECT id, recurrence, start_time, provider_id, listing_id
    FROM appointments 
    WHERE recurrence = 'triweekly'
    AND status IN ('pending', 'confirmed')
  LOOP
    RAISE LOG 'Fixing slots for triweekly appointment %', appointment_record.id;
    
    -- Unblock existing incorrectly blocked slots
    SELECT unblock_recurring_slots_for_appointment(appointment_record.id) INTO slots_fixed;
    
    -- Re-block with correct logic
    SELECT block_recurring_slots_for_appointment(appointment_record.id, 12) INTO slots_fixed;
    
    total_fixed := total_fixed + slots_fixed;
    
    RAISE LOG 'Fixed % slots for appointment %', slots_fixed, appointment_record.id;
  END LOOP;
  
  RAISE LOG 'Total slots fixed: %', total_fixed;
  RETURN total_fixed;
END;
$$;

-- Function to clean slots older than 4 weeks and regenerate current slots
CREATE OR REPLACE FUNCTION public.cleanup_and_regenerate_slots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cleanup_date DATE;
  future_limit DATE;
  slots_cleaned INTEGER := 0;
  slots_generated INTEGER := 0;
  listing_record RECORD;
BEGIN
  -- Clean slots older than current date
  cleanup_date := CURRENT_DATE;
  future_limit := CURRENT_DATE + INTERVAL '4 weeks';
  
  -- Delete old non-reserved slots
  DELETE FROM provider_time_slots
  WHERE slot_date < cleanup_date
  AND is_reserved = false;
  
  GET DIAGNOSTICS slots_cleaned = ROW_COUNT;
  
  -- Delete future slots beyond 4 weeks that are not recurring_blocked
  DELETE FROM provider_time_slots
  WHERE slot_date > future_limit
  AND recurring_blocked = false
  AND is_reserved = false;
  
  -- Regenerate slots for all active listings for the next 4 weeks only
  FOR listing_record IN 
    SELECT id, provider_id, availability, standard_duration
    FROM listings 
    WHERE is_active = true 
    AND availability IS NOT NULL
    AND availability != '{}'::jsonb
  LOOP
    -- Clean existing future non-reserved slots for this listing within 4 weeks
    DELETE FROM provider_time_slots
    WHERE listing_id = listing_record.id
    AND slot_date BETWEEN CURRENT_DATE AND future_limit
    AND is_reserved = false
    AND recurring_blocked = false;
    
    -- Generate new slots for exactly 4 weeks
    SELECT generate_provider_time_slots_for_listing(
      listing_record.provider_id,
      listing_record.id,
      4 -- Exactly 4 weeks ahead
    ) INTO slots_generated;
    
  END LOOP;
  
  RAISE LOG 'Cleanup complete: % old slots removed, % new slots generated', 
    slots_cleaned, slots_generated;
  
  RETURN slots_generated;
END;
$$;

-- Run the fix for existing triweekly appointments
SELECT fix_triweekly_blocked_slots();