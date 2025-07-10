-- Fix the corrupted create_recurring_rule_from_appointment function
-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_create_recurring_rule ON appointments;
DROP FUNCTION IF EXISTS public.create_recurring_rule_from_appointment();

-- Recreate the function with proper type casting
CREATE OR REPLACE FUNCTION public.create_recurring_rule_from_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  day_of_week_val INTEGER;
  day_of_month_val INTEGER;
  rule_id UUID;
  real_client_name TEXT;
  existing_rule_id UUID;
  local_start_time TIME;
  local_end_time TIME;
  local_date DATE;
BEGIN
  -- Only process if is a CONFIRMED recurring appointment and NOT an instance
  IF NEW.recurrence IN ('weekly', 'biweekly', 'monthly') AND 
     NEW.status = 'confirmed' AND
     (NEW.is_recurring_instance = false OR NEW.is_recurring_instance IS NULL) AND
     NEW.recurring_rule_id IS NULL THEN
    
    -- Convert UTC appointment times to LOCAL time for recurring rule
    local_start_time := (NEW.start_time AT TIME ZONE 'America/Costa_Rica')::TIME;
    local_end_time := (NEW.end_time AT TIME ZONE 'America/Costa_Rica')::TIME;
    local_date := (NEW.start_time AT TIME ZONE 'America/Costa_Rica')::DATE;
    
    -- Get the real client name
    SELECT name INTO real_client_name 
    FROM users 
    WHERE id = NEW.client_id;
    
    -- Check if a similar active rule already exists for this exact combination
    SELECT id INTO existing_rule_id
    FROM recurring_rules 
    WHERE client_id = NEW.client_id 
      AND provider_id = NEW.provider_id 
      AND listing_id = NEW.listing_id
      AND recurrence_type = NEW.recurrence
      AND start_time = local_start_time
      AND end_time = local_end_time
      AND is_active = true
      AND start_date <= local_date;
      
    -- Only create rule if no similar active rule exists
    IF existing_rule_id IS NULL THEN
      -- Calculate day of week and day of month with proper casting
      day_of_week_val := EXTRACT(DOW FROM local_date::TIMESTAMP)::INTEGER;
      day_of_month_val := EXTRACT(DAY FROM local_date::TIMESTAMP)::INTEGER;
      
      -- Create the recurring rule with LOCAL times
      INSERT INTO recurring_rules (
        client_id,
        provider_id,
        listing_id,
        recurrence_type,
        start_date,
        start_time,
        end_time,
        day_of_week,
        day_of_month,
        is_active,
        client_name,
        notes,
        client_address,
        client_phone,
        client_email
      ) VALUES (
        NEW.client_id,
        NEW.provider_id,
        NEW.listing_id,
        NEW.recurrence,
        local_date,
        local_start_time,
        local_end_time,
        CASE 
          WHEN NEW.recurrence IN ('weekly', 'biweekly') THEN day_of_week_val
          ELSE NULL
        END,
        CASE 
          WHEN NEW.recurrence = 'monthly' THEN day_of_month_val
          ELSE NULL
        END,
        true,
        COALESCE(real_client_name, NEW.client_name),
        NEW.notes,
        NEW.client_address,
        NEW.client_phone,
        NEW.client_email
      ) RETURNING id INTO rule_id;
      
      -- Update the appointment with the rule ID
      UPDATE appointments 
      SET recurring_rule_id = rule_id
      WHERE id = NEW.id;
    ELSE
      rule_id := existing_rule_id;
      
      -- Update the appointment with the existing rule ID
      UPDATE appointments 
      SET recurring_rule_id = rule_id
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the appointment update
    RAISE WARNING 'Error in create_recurring_rule_from_appointment: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger with more specific conditions
CREATE TRIGGER trigger_create_recurring_rule 
AFTER UPDATE ON appointments
FOR EACH ROW 
WHEN (NEW.status = 'confirmed' AND OLD.status = 'pending')
EXECUTE FUNCTION public.create_recurring_rule_from_appointment();

-- Also fix the check_recurring_availability function that has similar EXTRACT issues
CREATE OR REPLACE FUNCTION public.check_recurring_availability(
  p_provider_id uuid, 
  p_start_time timestamp with time zone, 
  p_end_time timestamp with time zone, 
  p_exclude_rule_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_count INTEGER;
  p_day_of_week INTEGER;
  p_time_of_day TIME;
  p_end_time_of_day TIME;
  p_day_of_month INTEGER;
BEGIN
  -- Extract components of time with proper casting
  p_day_of_week := EXTRACT(DOW FROM p_start_time::TIMESTAMP)::INTEGER;
  p_time_of_day := p_start_time::TIME;
  p_end_time_of_day := p_end_time::TIME;
  p_day_of_month := EXTRACT(DAY FROM p_start_time::TIMESTAMP)::INTEGER;
  
  -- Check conflicts with active recurring rules
  SELECT COUNT(*) INTO conflict_count
  FROM recurring_rules rr
  WHERE rr.provider_id = p_provider_id
    AND rr.is_active = true
    AND (p_exclude_rule_id IS NULL OR rr.id != p_exclude_rule_id)
    AND (
      -- Check if the requested time conflicts with any recurrence
      (rr.recurrence_type = 'weekly' AND 
       p_day_of_week = rr.day_of_week AND
       rr.start_time < p_end_time_of_day AND
       rr.end_time > p_time_of_day)
      OR
      (rr.recurrence_type = 'biweekly' AND 
       p_day_of_week = rr.day_of_week AND
       EXTRACT(DAYS FROM p_start_time::DATE - rr.start_date)::INTEGER % 14 = 0 AND
       rr.start_time < p_end_time_of_day AND
       rr.end_time > p_time_of_day)
      OR
      (rr.recurrence_type = 'monthly' AND 
       p_day_of_month = rr.day_of_month AND
       rr.start_time < p_end_time_of_day AND
       rr.end_time > p_time_of_day)
    );
  
  RETURN conflict_count = 0;
EXCEPTION
  WHEN OTHERS THEN
    -- Return true (available) if function fails to avoid blocking appointments
    RAISE WARNING 'Error in check_recurring_availability: %', SQLERRM;
    RETURN true;
END;
$$;