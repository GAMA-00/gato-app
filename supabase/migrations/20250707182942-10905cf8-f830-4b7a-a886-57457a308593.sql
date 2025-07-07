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

-- Update the generate_provider_time_slots function to include new fields
CREATE OR REPLACE FUNCTION public.generate_provider_time_slots(
  p_provider_id UUID, 
  p_listing_id UUID, 
  p_start_date DATE, 
  p_end_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $function$
DECLARE
  availability_record RECORD;
  iter_date DATE;
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  service_duration INTEGER;
  slots_created INTEGER := 0;
  row_count_var INTEGER;
BEGIN
  -- Get service duration
  SELECT standard_duration INTO service_duration
  FROM listings 
  WHERE id = p_listing_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'Service duration not found for listing %', p_listing_id;
  END IF;
  
  -- Iterate through each day in range
  iter_date := p_start_date;
  WHILE iter_date <= p_end_date LOOP
    
    -- Get availability for this day of week
    FOR availability_record IN 
      SELECT day_of_week, start_time, end_time
      FROM provider_availability
      WHERE provider_id = p_provider_id 
        AND day_of_week = EXTRACT(DOW FROM iter_date)
        AND is_active = true
    LOOP
      
      -- Generate slots based on service duration
      slot_start := iter_date + availability_record.start_time;
      
      WHILE slot_start + (service_duration || ' minutes')::INTERVAL <= iter_date + availability_record.end_time LOOP
        slot_end := slot_start + (service_duration || ' minutes')::INTERVAL;
        
        -- Insert slot with new fields
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
          is_manually_disabled,
          slot_type
        ) VALUES (
          p_provider_id,
          p_listing_id,
          iter_date,
          slot_start::TIME,
          slot_end::TIME,
          slot_start,
          slot_end,
          true,
          false,
          false,
          'generated'
        ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
        
        GET DIAGNOSTICS row_count_var = ROW_COUNT;
        slots_created := slots_created + row_count_var;
        
        -- Move to next slot
        slot_start := slot_end;
      END LOOP;
      
    END LOOP;
    
    iter_date := iter_date + 1;
  END LOOP;
  
  RETURN slots_created;
END;
$function$;

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
  current_date TIMESTAMP WITH TIME ZONE;
  end_date TIMESTAMP WITH TIME ZONE;
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
  
  current_date := p_start_time;
  end_date := p_start_time + (p_weeks_ahead * 7 || ' days')::INTERVAL;
  
  WHILE current_date <= end_date LOOP
    -- Block slots for this occurrence
    UPDATE provider_time_slots
    SET 
      is_available = false,
      is_reserved = true,
      recurring_blocked = true
    WHERE provider_id = p_provider_id
      AND slot_datetime_start = current_date
      AND slot_datetime_end = p_end_time + (current_date - p_start_time);
    
    slots_blocked := slots_blocked + 1;
    
    -- Move to next occurrence
    current_date := current_date + (week_interval * 7 || ' days')::INTERVAL;
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