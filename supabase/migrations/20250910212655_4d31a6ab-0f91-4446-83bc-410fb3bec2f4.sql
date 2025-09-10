-- Update the release_recurring_slots trigger function to handle provider cancellations
CREATE OR REPLACE FUNCTION public.release_recurring_slots()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Release recurring slots if appointment is cancelled/rejected
  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status NOT IN ('cancelled', 'rejected') THEN
    
    -- Check if the cancellation was made by the provider
    IF NEW.last_modified_by = NEW.provider_id THEN
      -- Provider cancellation: BLOCK the slot to prevent future bookings
      UPDATE provider_time_slots
      SET 
        is_available = false,
        is_reserved = false,
        slot_type = 'manually_blocked',
        recurring_blocked = false
      WHERE provider_id = NEW.provider_id
        AND slot_datetime_start = NEW.start_time
        AND slot_datetime_end = NEW.end_time;
        
      -- Also block future recurring slots if it was a recurring appointment
      IF NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none' THEN
        UPDATE provider_time_slots
        SET 
          is_available = false,
          is_reserved = false,
          slot_type = 'manually_blocked',
          recurring_blocked = false
        WHERE provider_id = NEW.provider_id
          AND recurring_blocked = true
          AND start_time = NEW.start_time::time
          AND slot_date > NEW.start_time::date;
      END IF;
      
    ELSE
      -- Client cancellation or other: RELEASE the slots normally
      IF NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none' THEN
        -- Recurring appointment, release future slots
        UPDATE provider_time_slots
        SET 
          is_available = true,
          is_reserved = false,
          recurring_blocked = false
        WHERE provider_id = NEW.provider_id
          AND recurring_blocked = true
          AND slot_datetime_start >= NEW.start_time;
      ELSE
        -- Regular appointment, just release this slot
        UPDATE provider_time_slots
        SET 
          is_available = true,
          is_reserved = false
        WHERE provider_id = NEW.provider_id
          AND slot_datetime_start = NEW.start_time
          AND slot_datetime_end = NEW.end_time;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;