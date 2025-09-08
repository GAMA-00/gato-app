-- Fix the advance_recurring_appointment function to not reference non-existent updated_at column
-- and handle invalid recurrence patterns properly

CREATE OR REPLACE FUNCTION public.advance_recurring_appointment(p_appointment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  appointment_record appointments%ROWTYPE;
  next_occurrence_date TIMESTAMP WITH TIME ZONE;
  new_appointment_id UUID;
  recurrence_interval INTERVAL;
  result JSONB;
BEGIN
  -- Get the appointment details
  SELECT * INTO appointment_record 
  FROM appointments 
  WHERE id = p_appointment_id AND status = 'completed';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Appointment not found or not completed');
  END IF;
  
  -- Validate recurrence pattern
  IF appointment_record.recurrence IS NULL 
     OR appointment_record.recurrence IN ('none', 'once', '') THEN
    RETURN jsonb_build_object('error', 'Invalid recurrence pattern: ' || COALESCE(appointment_record.recurrence, 'null'));
  END IF;
  
  -- Calculate next occurrence based on recurrence type
  CASE appointment_record.recurrence
    WHEN 'weekly' THEN
      recurrence_interval := INTERVAL '1 week';
    WHEN 'biweekly' THEN
      recurrence_interval := INTERVAL '2 weeks';
    WHEN 'triweekly' THEN
      recurrence_interval := INTERVAL '3 weeks';
    WHEN 'monthly' THEN
      recurrence_interval := INTERVAL '1 month';
    ELSE
      RETURN jsonb_build_object('error', 'Invalid recurrence pattern: ' || appointment_record.recurrence);
  END CASE;
  
  -- Calculate the next occurrence date
  next_occurrence_date := appointment_record.start_time + recurrence_interval;
  
  -- Check if next occurrence is in the future
  IF next_occurrence_date <= NOW() THEN
    -- If the next occurrence is still in the past, calculate the next future occurrence
    WHILE next_occurrence_date <= NOW() LOOP
      next_occurrence_date := next_occurrence_date + recurrence_interval;
    END LOOP;
  END IF;
  
  -- Check for conflicts at the next occurrence time
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE provider_id = appointment_record.provider_id
      AND start_time < (next_occurrence_date + (appointment_record.end_time - appointment_record.start_time))
      AND end_time > next_occurrence_date
      AND status IN ('pending', 'confirmed')
  ) THEN
    RETURN jsonb_build_object('error', 'Next occurrence conflicts with existing appointment');
  END IF;
  
  -- Create the next recurring appointment
  INSERT INTO appointments (
    listing_id,
    client_id,
    provider_id,
    residencia_id,
    start_time,
    end_time,
    status,
    notes,
    client_address,
    client_phone,
    client_email,
    client_name,
    provider_name,
    recurrence,
    recurrence_group_id,
    external_booking,
    is_recurring_instance
  ) VALUES (
    appointment_record.listing_id,
    appointment_record.client_id,
    appointment_record.provider_id,
    appointment_record.residencia_id,
    next_occurrence_date,
    next_occurrence_date + (appointment_record.end_time - appointment_record.start_time),
    'confirmed',
    appointment_record.notes,
    appointment_record.client_address,
    appointment_record.client_phone,
    appointment_record.client_email,
    appointment_record.client_name,
    appointment_record.provider_name,
    appointment_record.recurrence,
    appointment_record.recurrence_group_id,
    appointment_record.external_booking,
    true -- Mark as recurring instance
  ) RETURNING id INTO new_appointment_id;
  
  -- Block the corresponding time slot for the new appointment
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
    appointment_record.provider_id,
    appointment_record.listing_id,
    next_occurrence_date::DATE,
    next_occurrence_date::TIME,
    (next_occurrence_date + (appointment_record.end_time - appointment_record.start_time))::TIME,
    next_occurrence_date,
    next_occurrence_date + (appointment_record.end_time - appointment_record.start_time),
    false,
    true,
    true
  ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
  DO UPDATE SET 
    is_available = false,
    is_reserved = true,
    recurring_blocked = true;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_appointment_id', new_appointment_id,
    'next_occurrence', next_occurrence_date
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;