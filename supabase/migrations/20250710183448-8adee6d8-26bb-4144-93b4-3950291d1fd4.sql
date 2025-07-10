-- Fix permissions for block_recurring_slots function
CREATE OR REPLACE FUNCTION public.block_recurring_slots(
  p_recurring_rule_id UUID, 
  p_months_ahead INTEGER DEFAULT 12
) 
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to run with elevated privileges
AS $$
DECLARE
  rule_record RECORD;
  current_date DATE;
  end_date DATE;
  target_date DATE;
  target_start_datetime TIMESTAMP WITH TIME ZONE;
  target_end_datetime TIMESTAMP WITH TIME ZONE;
  slots_created INTEGER := 0;
  existing_slot_id UUID;
BEGIN
  -- Get the recurring rule details
  SELECT * INTO rule_record
  FROM recurring_rules
  WHERE id = p_recurring_rule_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Set date range for blocking
  current_date := rule_record.start_date;
  end_date := current_date + INTERVAL '1 month' * p_months_ahead;
  
  -- Loop through dates within the range
  WHILE current_date <= end_date LOOP
    target_date := NULL;
    
    -- Determine target date based on recurrence type
    IF rule_record.recurrence_type = 'weekly' THEN
      -- Weekly: every week on the same day
      IF EXTRACT(DOW FROM current_date) = rule_record.day_of_week THEN
        target_date := current_date;
      END IF;
    ELSIF rule_record.recurrence_type = 'biweekly' THEN
      -- Biweekly: every two weeks on the same day
      IF EXTRACT(DOW FROM current_date) = rule_record.day_of_week AND
         EXTRACT(WEEK FROM current_date - rule_record.start_date) % 2 = 0 THEN
        target_date := current_date;
      END IF;
    ELSIF rule_record.recurrence_type = 'monthly' THEN
      -- Monthly: same day of month
      IF EXTRACT(DAY FROM current_date) = rule_record.day_of_month THEN
        target_date := current_date;
      END IF;
    END IF;
    
    -- If we have a target date, create or update the time slot
    IF target_date IS NOT NULL THEN
      target_start_datetime := target_date + rule_record.start_time;
      target_end_datetime := target_date + rule_record.end_time;
      
      -- Check if slot already exists
      SELECT id INTO existing_slot_id
      FROM provider_time_slots
      WHERE provider_id = rule_record.provider_id
        AND listing_id = rule_record.listing_id
        AND slot_date = target_date
        AND start_time = rule_record.start_time
        AND end_time = rule_record.end_time;
      
      IF existing_slot_id IS NULL THEN
        -- Insert new blocked slot
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
          recurring_rule_id,
          blocked_until,
          slot_type
        ) VALUES (
          rule_record.provider_id,
          rule_record.listing_id,
          target_date,
          rule_record.start_time,
          rule_record.end_time,
          target_start_datetime,
          target_end_datetime,
          false,  -- not available
          true,   -- reserved for recurring appointment
          true,   -- marked as recurring blocked
          p_recurring_rule_id,
          target_date,
          'recurring'
        );
        
        slots_created := slots_created + 1;
      ELSE
        -- Update existing slot to mark as recurring blocked
        UPDATE provider_time_slots
        SET 
          is_available = false,
          is_reserved = true,
          recurring_blocked = true,
          recurring_rule_id = p_recurring_rule_id,
          blocked_until = target_date,
          slot_type = 'recurring'
        WHERE id = existing_slot_id;
        
        slots_created := slots_created + 1;
      END IF;
    END IF;
    
    -- Move to next day
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN slots_created;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.block_recurring_slots TO authenticated;

-- Execute the function for all existing active recurring rules to generate blocked slots
DO $$
DECLARE
  rule_id UUID;
  slots_created INTEGER;
  total_slots INTEGER := 0;
BEGIN
  FOR rule_id IN SELECT id FROM recurring_rules WHERE is_active = true LOOP
    SELECT block_recurring_slots(rule_id, 12) INTO slots_created;
    total_slots := total_slots + slots_created;
    RAISE LOG 'Generated % slots for recurring rule %', slots_created, rule_id;
  END LOOP;
  
  RAISE LOG 'Total slots created: %', total_slots;
END;
$$;

-- Ensure the trigger functions have proper permissions
CREATE OR REPLACE FUNCTION public.auto_block_recurring_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  slots_created INTEGER;
BEGIN
  -- Only execute for new active recurring rules
  IF NEW.is_active = true AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.is_active = false)) THEN
    SELECT block_recurring_slots(NEW.id, 12) INTO slots_created;
    RAISE LOG 'Auto-generated % slots for new recurring rule %', slots_created, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_unblock_recurring_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  slots_unblocked INTEGER;
BEGIN
  -- Only execute when a rule becomes inactive
  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    SELECT unblock_recurring_slots(NEW.id) INTO slots_unblocked;
    RAISE LOG 'Auto-unblocked % slots for deactivated recurring rule %', slots_unblocked, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;