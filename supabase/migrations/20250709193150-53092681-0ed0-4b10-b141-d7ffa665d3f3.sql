-- Fix the create_recurring_rule_from_appointment function that causes the extract() error
CREATE OR REPLACE FUNCTION public.create_recurring_rule_from_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  day_of_week_val INTEGER;
  day_of_month_val INTEGER;
  rule_id UUID;
  real_client_name TEXT;
  existing_rule_id UUID;
  local_start_time TIME;
  local_end_time TIME;
BEGIN
  -- Only process if is a CONFIRMED recurring appointment and NOT an instance
  IF NEW.recurrence IN ('weekly', 'biweekly', 'monthly') AND 
     NEW.status = 'confirmed' AND
     (NEW.is_recurring_instance = false OR NEW.is_recurring_instance IS NULL) AND
     NEW.recurring_rule_id IS NULL THEN
    
    -- Convert UTC appointment times to LOCAL time for recurring rule
    local_start_time := (NEW.start_time AT TIME ZONE 'America/Costa_Rica')::TIME;
    local_end_time := (NEW.end_time AT TIME ZONE 'America/Costa_Rica')::TIME;
    
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
      AND start_date <= NEW.start_time::DATE;
      
    -- Only create rule if no similar active rule exists
    IF existing_rule_id IS NULL THEN
      -- Calculate day of week and day of month using LOCAL time - FIXED EXTRACT ISSUE
      day_of_week_val := EXTRACT(DOW FROM (NEW.start_time AT TIME ZONE 'America/Costa_Rica'))::INTEGER;
      day_of_month_val := EXTRACT(DAY FROM (NEW.start_time AT TIME ZONE 'America/Costa_Rica'))::INTEGER;
      
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
        (NEW.start_time AT TIME ZONE 'America/Costa_Rica')::DATE,
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
END;
$function$;