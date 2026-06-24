-- Create function to block recurring slots for appointments
CREATE OR REPLACE FUNCTION public.block_recurring_slots_for_appointment(
  p_appointment_id uuid,
  p_months_ahead integer DEFAULT 12
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  appointment_record appointments%ROWTYPE;
  slots_blocked INTEGER := 0;
  iter_date DATE;
  end_date DATE;
  slot_start_datetime TIMESTAMP WITH TIME ZONE;
  slot_end_datetime TIMESTAMP WITH TIME ZONE;
  service_duration INTEGER;
  recurrence_interval INTEGER;
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
  
  -- Set date limits (start from next week to avoid blocking current appointment)
  iter_date := (appointment_record.start_time::date) + 7;
  end_date := iter_date + (p_months_ahead * 30);
  
  -- Determine recurrence interval in days
  recurrence_interval := CASE appointment_record.recurrence
    WHEN 'weekly' THEN 7
    WHEN 'biweekly' THEN 14
    WHEN 'triweekly' THEN 21
    WHEN 'monthly' THEN 30
    ELSE 7
  END;
  
  RAISE LOG 'Blocking recurring slots for appointment % with recurrence % starting from %', 
    p_appointment_id, appointment_record.recurrence, iter_date;
  
  -- Block slots at the recurring interval
  WHILE iter_date <= end_date LOOP
    -- Calculate the slot datetime for this iteration
    slot_start_datetime := iter_date + (appointment_record.start_time::time);
    slot_end_datetime := slot_start_datetime + (service_duration || ' minutes')::interval;
    
    -- For monthly recurrence, ensure we're on the same day of month
    IF appointment_record.recurrence = 'monthly' THEN
      -- Adjust to the same day of month as original appointment
      IF EXTRACT(DAY FROM slot_start_datetime) != EXTRACT(DAY FROM appointment_record.start_time) THEN
        iter_date := iter_date + 1;
        CONTINUE;
      END IF;
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
    
    -- Move to next occurrence
    iter_date := iter_date + recurrence_interval;
  END LOOP;
  
  RAISE LOG 'Blocked % recurring slots for appointment %', slots_blocked, p_appointment_id;
  RETURN slots_blocked;
END;
$function$;

-- Create function to unblock recurring slots for appointments
CREATE OR REPLACE FUNCTION public.unblock_recurring_slots_for_appointment(
  p_appointment_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  appointment_record appointments%ROWTYPE;
  slots_unblocked INTEGER;
BEGIN
  -- Get the appointment details
  SELECT * INTO appointment_record FROM appointments WHERE id = p_appointment_id;
  
  IF NOT FOUND THEN
    RAISE LOG 'Appointment not found: %', p_appointment_id;
    RETURN 0;
  END IF;
  
  -- Unblock all future slots for this provider/listing that were blocked by recurring appointments
  -- matching the same time pattern
  UPDATE provider_time_slots 
  SET 
    is_available = true,
    is_reserved = false,
    recurring_blocked = false,
    blocked_until = NULL
  WHERE provider_id = appointment_record.provider_id
    AND listing_id = appointment_record.listing_id
    AND recurring_blocked = true
    AND start_time = appointment_record.start_time::time
    AND slot_date > appointment_record.start_time::date;
  
  GET DIAGNOSTICS slots_unblocked = ROW_COUNT;
  
  RAISE LOG 'Unblocked % recurring slots for appointment %', slots_unblocked, p_appointment_id;
  RETURN slots_unblocked;
END;
$function$;

-- Create trigger function for automatic recurring slot management
CREATE OR REPLACE FUNCTION public.manage_recurring_appointment_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  slots_affected INTEGER;
BEGIN
  -- Handle INSERT: Block recurring slots for new recurring appointments
  IF TG_OP = 'INSERT' AND NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none' THEN
    SELECT block_recurring_slots_for_appointment(NEW.id, 12) INTO slots_affected;
    RAISE LOG 'Auto-blocked % slots for new recurring appointment %', slots_affected, NEW.id;
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE: Manage slot blocking based on status and recurrence changes
  IF TG_OP = 'UPDATE' THEN
    -- If appointment was cancelled or rejected, unblock its recurring slots
    IF NEW.status IN ('cancelled', 'rejected') 
       AND OLD.status NOT IN ('cancelled', 'rejected')
       AND OLD.recurrence IS NOT NULL 
       AND OLD.recurrence != 'none' THEN
      SELECT unblock_recurring_slots_for_appointment(NEW.id) INTO slots_affected;
      RAISE LOG 'Auto-unblocked % slots for cancelled recurring appointment %', slots_affected, NEW.id;
    END IF;
    
    -- If recurrence was added to existing appointment, block slots
    IF NEW.recurrence IS NOT NULL 
       AND NEW.recurrence != 'none' 
       AND (OLD.recurrence IS NULL OR OLD.recurrence = 'none') THEN
      SELECT block_recurring_slots_for_appointment(NEW.id, 12) INTO slots_affected;
      RAISE LOG 'Auto-blocked % slots for updated recurring appointment %', slots_affected, NEW.id;
    END IF;
    
    -- If recurrence was removed, unblock slots
    IF (NEW.recurrence IS NULL OR NEW.recurrence = 'none') 
       AND OLD.recurrence IS NOT NULL 
       AND OLD.recurrence != 'none' THEN
      SELECT unblock_recurring_slots_for_appointment(NEW.id) INTO slots_affected;
      RAISE LOG 'Auto-unblocked % slots for removed recurring appointment %', slots_affected, NEW.id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create the trigger on appointments table
DROP TRIGGER IF EXISTS manage_recurring_slots_trigger ON appointments;
CREATE TRIGGER manage_recurring_slots_trigger
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION manage_recurring_appointment_slots();

-- Function to migrate existing recurring appointments
CREATE OR REPLACE FUNCTION public.migrate_existing_recurring_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  appointment_record RECORD;
  total_slots_blocked INTEGER := 0;
  slots_blocked INTEGER;
BEGIN
  -- Find all existing recurring appointments that are active
  FOR appointment_record IN 
    SELECT id, recurrence, status, start_time
    FROM appointments 
    WHERE recurrence IS NOT NULL 
    AND recurrence != 'none'
    AND status IN ('pending', 'confirmed')
    AND start_time > NOW() -- Only future appointments
  LOOP
    -- Block recurring slots for this appointment
    SELECT block_recurring_slots_for_appointment(appointment_record.id, 12) INTO slots_blocked;
    total_slots_blocked := total_slots_blocked + slots_blocked;
    
    RAISE LOG 'Migrated appointment % (%): blocked % slots', 
      appointment_record.id, appointment_record.recurrence, slots_blocked;
  END LOOP;
  
  RAISE LOG 'Migration complete: blocked % total slots across all existing recurring appointments', 
    total_slots_blocked;
  
  RETURN total_slots_blocked;
END;
$function$;