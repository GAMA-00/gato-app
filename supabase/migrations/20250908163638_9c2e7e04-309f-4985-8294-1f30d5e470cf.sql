-- Fix recurring appointments system

-- 1. First, let's create a proper trigger for managing recurring appointment slots
DROP TRIGGER IF EXISTS manage_recurring_slots_trigger ON appointments;

CREATE OR REPLACE TRIGGER manage_recurring_slots_trigger
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION manage_recurring_appointment_slots();

-- 2. Update mark_past_appointments_completed to exclude recurring appointments
CREATE OR REPLACE FUNCTION public.mark_past_appointments_completed()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Mark appointments as completed if they ended more than 1 hour ago and are still confirmed
  -- BUT exclude recurring appointments (they should remain active for the recurring pattern)
  UPDATE appointments 
  SET status = 'completed'
  WHERE status = 'confirmed' 
    AND end_time < (NOW() - INTERVAL '1 hour')
    AND (recurrence IS NULL OR recurrence = 'none' OR recurrence = ''); -- Only non-recurring appointments
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$function$;

-- 3. Reset any recurring appointments that were incorrectly marked as completed back to confirmed
UPDATE appointments 
SET status = 'confirmed'
WHERE status = 'completed' 
  AND recurrence IS NOT NULL 
  AND recurrence != 'none' 
  AND recurrence != ''
  AND end_time > (NOW() - INTERVAL '24 hours'); -- Only recent ones to avoid old data issues

-- 4. Create a function to properly handle recurring appointment lifecycle
CREATE OR REPLACE FUNCTION public.advance_recurring_appointment(p_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  appointment_record appointments%ROWTYPE;
  next_start_time TIMESTAMPTZ;
  next_end_time TIMESTAMPTZ;
  new_appointment_id UUID;
BEGIN
  -- Get the current appointment
  SELECT * INTO appointment_record FROM appointments WHERE id = p_appointment_id;
  
  IF NOT FOUND OR appointment_record.recurrence IS NULL OR appointment_record.recurrence IN ('none', '') THEN
    RAISE EXCEPTION 'Appointment not found or not recurring';
  END IF;
  
  -- Calculate next occurrence based on recurrence pattern
  CASE appointment_record.recurrence
    WHEN 'weekly' THEN
      next_start_time := appointment_record.start_time + INTERVAL '1 week';
    WHEN 'biweekly' THEN
      next_start_time := appointment_record.start_time + INTERVAL '2 weeks';
    WHEN 'triweekly' THEN
      next_start_time := appointment_record.start_time + INTERVAL '3 weeks';
    WHEN 'monthly' THEN
      next_start_time := appointment_record.start_time + INTERVAL '1 month';
    ELSE
      RAISE EXCEPTION 'Invalid recurrence pattern: %', appointment_record.recurrence;
  END CASE;
  
  next_end_time := next_start_time + (appointment_record.end_time - appointment_record.start_time);
  
  -- Update current appointment to next occurrence
  UPDATE appointments
  SET 
    start_time = next_start_time,
    end_time = next_end_time,
    status = 'confirmed',
    updated_at = NOW()
  WHERE id = p_appointment_id;
  
  -- Block the new recurring slots
  PERFORM block_recurring_slots_for_appointment(p_appointment_id, 12);
  
  RETURN p_appointment_id;
END;
$function$;