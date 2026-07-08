-- Enhance provider_time_slots table with manual disable functionality
ALTER TABLE provider_time_slots 
ADD COLUMN IF NOT EXISTS is_manually_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slot_type TEXT DEFAULT 'generated',
ADD COLUMN IF NOT EXISTS recurring_blocked BOOLEAN DEFAULT FALSE;

-- Create index for better performance on slot queries
CREATE INDEX IF NOT EXISTS idx_provider_time_slots_provider_date 
ON provider_time_slots(provider_id, slot_date);

CREATE INDEX IF NOT EXISTS idx_provider_time_slots_datetime 
ON provider_time_slots(slot_datetime_start, slot_datetime_end);

-- Function to block recurring slots
CREATE OR REPLACE FUNCTION public.block_recurring_slots(
  p_provider_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_recurrence_type TEXT,
  p_weeks_ahead INTEGER DEFAULT 12
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $function$
DECLARE
  current_datetime TIMESTAMP WITH TIME ZONE;
  end_datetime TIMESTAMP WITH TIME ZONE;
  slots_blocked INTEGER := 0;
  week_interval INTEGER;
BEGIN
  -- Set interval based on recurrence type
  CASE p_recurrence_type
    WHEN 'weekly' THEN week_interval := 1;
    WHEN 'biweekly' THEN week_interval := 2;
    WHEN 'monthly' THEN week_interval := 4; -- approximate
    ELSE RETURN 0; -- no recurrence
  END CASE;
  
  current_datetime := p_start_time;
  end_datetime := p_start_time + (p_weeks_ahead * 7 || ' days')::INTERVAL;
  
  WHILE current_datetime <= end_datetime LOOP
    -- Block slots for this occurrence
    UPDATE provider_time_slots
    SET 
      is_available = false,
      is_reserved = true,
      recurring_blocked = true
    WHERE provider_id = p_provider_id
      AND slot_datetime_start = current_datetime
      AND slot_datetime_end = p_end_time + (current_datetime - p_start_time);
    
    slots_blocked := slots_blocked + 1;
    
    -- Move to next occurrence
    current_datetime := current_datetime + (week_interval * 7 || ' days')::INTERVAL;
  END LOOP;
  
  RETURN slots_blocked;
END;
$function$;

-- Function to release recurring slots when appointment is cancelled
CREATE OR REPLACE FUNCTION public.release_recurring_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Release recurring slots if appointment is cancelled/rejected
  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status NOT IN ('cancelled', 'rejected') THEN
    -- If it's a recurring appointment, release future slots
    IF NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none' THEN
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
  
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic slot release
DROP TRIGGER IF EXISTS release_slots_on_cancellation ON appointments;
CREATE TRIGGER release_slots_on_cancellation
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION release_recurring_slots();