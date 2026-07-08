-- Fix the trigger that's creating duplicate appointments
-- The current trigger creates recurring rules for ALL appointments with recurrence,
-- which causes duplicate instances to be generated

DROP TRIGGER IF EXISTS trigger_create_recurring_rule ON appointments;
DROP FUNCTION IF EXISTS public.create_recurring_rule_from_appointment();

-- Create improved function that only creates rules when truly needed
CREATE OR REPLACE FUNCTION public.create_recurring_rule_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
  day_of_week_val INTEGER;
  day_of_month_val INTEGER;
  rule_id UUID;
  real_client_name TEXT;
  existing_rule_id UUID;
BEGIN
  -- Only process if is a CONFIRMED recurring appointment and NOT an instance
  -- This prevents creating rules for pending appointments and instances
  IF NEW.recurrence IN ('weekly', 'biweekly', 'monthly') AND 
     NEW.status = 'confirmed' AND
     (NEW.is_recurring_instance = false OR NEW.is_recurring_instance IS NULL) AND
     NEW.recurring_rule_id IS NULL THEN
    
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
      AND start_time = NEW.start_time::TIME
      AND end_time = NEW.end_time::TIME
      AND is_active = true
      AND start_date <= NEW.start_time::DATE;
      
    -- Only create rule if no similar active rule exists
    IF existing_rule_id IS NULL THEN
      -- Calculate day of week and day of month
      day_of_week_val := EXTRACT(DOW FROM NEW.start_time);
      day_of_month_val := EXTRACT(DAY FROM NEW.start_time);
      
      -- Create the recurring rule
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
        NEW.start_time::DATE,
        NEW.start_time::TIME,
        NEW.end_time::TIME,
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
      
      RAISE LOG 'Created new recurring rule % for CONFIRMED appointment % (client: %)', 
        rule_id, NEW.id, COALESCE(real_client_name, NEW.client_name);
        
      -- Update the appointment with the rule ID
      UPDATE appointments 
      SET recurring_rule_id = rule_id
      WHERE id = NEW.id;
    ELSE
      rule_id := existing_rule_id;
      RAISE LOG 'Using existing recurring rule % for appointment % (client: %)', 
        existing_rule_id, NEW.id, COALESCE(real_client_name, NEW.client_name);
        
      -- Update the appointment with the existing rule ID
      UPDATE appointments 
      SET recurring_rule_id = rule_id
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger to only fire on confirmed appointments
CREATE TRIGGER trigger_create_recurring_rule
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND OLD.status != 'confirmed')
  EXECUTE FUNCTION create_recurring_rule_from_appointment();

-- Also handle direct inserts of confirmed recurring appointments
CREATE TRIGGER trigger_create_recurring_rule_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none')
  EXECUTE FUNCTION create_recurring_rule_from_appointment();

-- Clean up existing duplicate/invalid data
-- Remove recurring rules that were created for non-confirmed appointments
DELETE FROM recurring_rules 
WHERE id IN (
  SELECT rr.id 
  FROM recurring_rules rr
  JOIN appointments a ON a.recurring_rule_id = rr.id
  WHERE a.status != 'confirmed'
);

-- Reset appointments that shouldn't have recurring_rule_id
UPDATE appointments 
SET recurring_rule_id = NULL 
WHERE status != 'confirmed' 
  AND recurring_rule_id IS NOT NULL;

-- Remove duplicate recurring rules (keep the oldest one for each unique combination)
WITH duplicate_rules AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, provider_id, listing_id, recurrence_type, start_time, end_time 
      ORDER BY created_at ASC
    ) as rn
  FROM recurring_rules
  WHERE is_active = true
)
DELETE FROM recurring_rules 
WHERE id IN (
  SELECT id FROM duplicate_rules WHERE rn > 1
);