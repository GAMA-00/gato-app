-- Fix the P0001 error by harmonizing database triggers and constraints

-- First, let's fix the block_recurring_slots_for_appointment function
-- to use the correct ON CONFLICT clause that matches the actual unique constraint
CREATE OR REPLACE FUNCTION public.block_recurring_slots_for_appointment(p_appointment_id uuid, p_months_ahead integer DEFAULT 12)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  appointment_record appointments%ROWTYPE;
  slots_blocked INTEGER := 0;
  iter_date DATE;
  end_date DATE;
  slot_start_time TIME;
  slot_end_time TIME;
  slot_start_datetime TIMESTAMP WITH TIME ZONE;
  slot_end_datetime TIMESTAMP WITH TIME ZONE;
  recurrence_interval INTEGER;
BEGIN
  -- Get the appointment details
  SELECT * INTO appointment_record FROM appointments WHERE id = p_appointment_id;
  
  IF NOT FOUND THEN
    RAISE LOG 'Appointment not found: %', p_appointment_id;
    RETURN 0;
  END IF;
  
  RAISE LOG 'Blocking recurring slots for appointment % with recurrence % starting from % (original: %)', 
    p_appointment_id, appointment_record.recurrence, 
    appointment_record.start_time::date, appointment_record.start_time::date;
  
  -- Only block slots for recurring appointments
  IF appointment_record.recurrence IS NULL OR appointment_record.recurrence = 'none' THEN
    RETURN 0;
  END IF;
  
  -- Calculate recurrence interval
  recurrence_interval := CASE appointment_record.recurrence
    WHEN 'weekly' THEN 7
    WHEN 'biweekly' THEN 14
    WHEN 'monthly' THEN 30
    ELSE 7
  END;
  
  -- Set date range for blocking future slots
  iter_date := appointment_record.start_time::date;
  end_date := iter_date + (p_months_ahead * 30);
  slot_start_time := appointment_record.start_time::time;
  slot_end_time := appointment_record.end_time::time;
  
  -- Block recurring slots at the same time pattern
  WHILE iter_date <= end_date LOOP
    slot_start_datetime := iter_date + slot_start_time;
    slot_end_datetime := iter_date + slot_end_time;
    
    -- Skip past dates
    IF slot_start_datetime > NOW() THEN
      -- Use the correct unique constraint for ON CONFLICT
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
        slot_start_time,
        slot_end_time,
        slot_start_datetime,
        slot_end_datetime,
        false,
        true,
        true,
        end_date
      ) 
      -- Fix: Use the correct unique constraint columns
      ON CONFLICT (provider_id, listing_id, slot_date, start_time) 
      DO UPDATE SET
        is_available = false,
        is_reserved = true,
        recurring_blocked = true,
        blocked_until = EXCLUDED.blocked_until;
      
      slots_blocked := slots_blocked + 1;
    END IF;
    
    -- Move to next occurrence
    iter_date := iter_date + recurrence_interval;
  END LOOP;
  
  RAISE LOG 'Blocked % recurring slots for appointment %', slots_blocked, p_appointment_id;
  RETURN slots_blocked;
END;
$function$;

-- Modify the validation trigger to be less restrictive during internal operations
CREATE OR REPLACE FUNCTION public.validate_slot_insertion()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  existing_slot_count INTEGER;
BEGIN
  -- Skip validation for system/internal operations (when recurring_blocked is being set)
  IF NEW.recurring_blocked = true THEN
    RETURN NEW;
  END IF;
  
  -- Only validate for user-generated slots, not system-generated recurring blocks
  IF NEW.slot_type = 'generated' OR NEW.slot_type IS NULL THEN
    -- Check for existing slots at the same time
    SELECT COUNT(*) INTO existing_slot_count
    FROM provider_time_slots
    WHERE provider_id = NEW.provider_id
      AND listing_id = NEW.listing_id
      AND slot_date = NEW.slot_date
      AND start_time = NEW.start_time
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF existing_slot_count > 0 THEN
      RAISE EXCEPTION 'Ya existe un slot para el proveedor % en el listing % el día % a las %',
        NEW.provider_id, NEW.listing_id, NEW.slot_date, NEW.start_time;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the trigger to be less aggressive
DROP TRIGGER IF EXISTS validate_slot_insertion_trigger ON provider_time_slots;
CREATE TRIGGER validate_slot_insertion_trigger
  BEFORE INSERT ON provider_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION validate_slot_insertion();