-- ==========================================
-- Add Daily Recurrence Support to All Functions
-- ==========================================

-- 1. Update advance_recurring_appointment to support daily recurrence
DROP FUNCTION IF EXISTS public.advance_recurring_appointment(uuid);

CREATE FUNCTION public.advance_recurring_appointment(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  appt appointments%ROWTYPE;
  interval_rec INTERVAL;
  next_start TIMESTAMPTZ;
  next_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found' USING ERRCODE = 'P0001';
  END IF;

  -- Only advance valid recurring patterns
  IF appt.recurrence IS NULL OR appt.recurrence IN ('none','once','') THEN
    RAISE EXCEPTION 'Invalid recurrence pattern: %', COALESCE(appt.recurrence,'null') USING ERRCODE='P0001';
  END IF;

  -- Add daily to the CASE statement
  CASE appt.recurrence
    WHEN 'daily' THEN interval_rec := INTERVAL '1 day';
    WHEN 'weekly' THEN interval_rec := INTERVAL '1 week';
    WHEN 'biweekly' THEN interval_rec := INTERVAL '2 weeks';
    WHEN 'triweekly' THEN interval_rec := INTERVAL '3 weeks';
    WHEN 'monthly' THEN interval_rec := INTERVAL '1 month';
    ELSE RAISE EXCEPTION 'Invalid recurrence pattern: %', appt.recurrence USING ERRCODE='P0001';
  END CASE;

  next_start := appt.start_time + interval_rec;
  next_end := appt.end_time + interval_rec;

  -- Ensure we move to a future occurrence
  WHILE next_start <= now() LOOP
    next_start := next_start + interval_rec;
    next_end := next_end + interval_rec;
  END LOOP;

  -- Prevent conflicts with existing active appointments
  IF EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.provider_id = appt.provider_id
      AND a.status NOT IN ('cancelled','rejected')
      AND a.start_time < next_end
      AND a.end_time > next_start
  ) THEN
     RAISE EXCEPTION 'Next occurrence conflicts with existing appointment' USING ERRCODE='P0001';
  END IF;

  -- Create the next appointment instance
  INSERT INTO appointments (
    listing_id, client_id, provider_id, residencia_id,
    start_time, end_time, status, notes, client_address,
    client_phone, client_email, client_name, provider_name,
    recurrence, recurrence_group_id, external_booking, is_recurring_instance, created_at,
    created_from, created_by_user
  ) VALUES (
    appt.listing_id, appt.client_id, appt.provider_id, appt.residencia_id,
    next_start, next_end, 'confirmed', appt.notes, appt.client_address,
    appt.client_phone, appt.client_email, appt.client_name, appt.provider_name,
    appt.recurrence, appt.recurrence_group_id, appt.external_booking, true, now(),
    'auto_advanced', appt.client_id
  );

  -- Block the time slot for provider calendar
  INSERT INTO provider_time_slots (
    provider_id, listing_id, slot_date, start_time, end_time,
    slot_datetime_start, slot_datetime_end, is_available, is_reserved, recurring_blocked, slot_type, created_at
  ) VALUES (
    appt.provider_id, appt.listing_id, next_start::date, next_start::time, next_end::time,
    next_start, next_end, false, true, true, 'reserved', now()
  )
  ON CONFLICT (provider_id, listing_id, slot_datetime_start)
  DO UPDATE SET is_available=false, is_reserved=true, recurring_blocked=true, slot_type='reserved';
  
  RAISE LOG '✅ Advanced % appointment % to next occurrence: %', appt.recurrence, p_appointment_id, next_start;
END;
$$;

-- 2. Update calculate_next_occurrence_sql to support daily recurrence
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
    WHEN 'daily' THEN
      -- Simply add 1 day
      next_date := reference_date + 1;
      -- Ensure we're in the future
      WHILE next_date <= reference_date LOOP
        next_date := next_date + 1;
      END LOOP;
      
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

-- 3. Update block_recurring_slots_for_appointment to support daily recurrence
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
  max_slots INTEGER := 365;
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
    WHEN 'daily' THEN 1
    WHEN 'weekly' THEN 7
    WHEN 'biweekly' THEN 14
    WHEN 'triweekly' THEN 21
    WHEN 'monthly' THEN 30
    ELSE 7
  END;
  
  RAISE LOG 'Blocking recurring slots for appointment % with recurrence % starting from % (original: %)', 
    p_appointment_id, appointment_record.recurrence, iter_date, original_appointment_date;
  
  -- Block slots at the correct recurring interval
  WHILE iter_date <= end_date AND slots_blocked < max_slots LOOP
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
      WHEN 'daily' THEN
        -- Every day is valid for daily recurrence
        is_valid_occurrence := true;
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
      false,
      true,
      true,
      end_date
    ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
    DO UPDATE SET
      is_available = false,
      is_reserved = true,
      recurring_blocked = true,
      blocked_until = end_date;
    
    slots_blocked := slots_blocked + 1;
    
    -- Only log every 7 days for daily appointments to reduce noise
    IF appointment_record.recurrence != 'daily' OR slots_blocked % 7 = 0 THEN
      RAISE LOG 'Blocked slot on % at % (total: %)', 
        iter_date, appointment_record.start_time::time, slots_blocked;
    END IF;
    
    -- Move to next occurrence using the proper interval
    iter_date := iter_date + recurrence_interval;
  END LOOP;
  
  IF slots_blocked >= max_slots THEN
    RAISE LOG '⚠️ Reached maximum slot limit (%) for daily appointment %', max_slots, p_appointment_id;
  END IF;
  
  RAISE LOG '✅ Blocked % recurring slots for appointment %', slots_blocked, p_appointment_id;
  RETURN slots_blocked;
END;
$$;