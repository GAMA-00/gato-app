-- Improved recurring appointment system
-- Clean up and optimize recurring rules creation

-- Drop existing trigger to replace with improved version
DROP TRIGGER IF EXISTS trigger_create_recurring_rule ON appointments;

-- Update the recurring rule creation function with better validation
CREATE OR REPLACE FUNCTION public.create_recurring_rule_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
  day_of_week_val INTEGER;
  day_of_month_val INTEGER;
  rule_id UUID;
  real_client_name TEXT;
  existing_rule_id UUID;
BEGIN
  -- Only process if is a recurring appointment and NOT an instance
  IF NEW.recurrence IN ('weekly', 'biweekly', 'monthly') AND 
     (NEW.is_recurring_instance = false OR NEW.is_recurring_instance IS NULL) THEN
    
    -- Get the real client name
    SELECT name INTO real_client_name 
    FROM users 
    WHERE id = NEW.client_id;
    
    -- Check if a similar active rule already exists
    SELECT id INTO existing_rule_id
    FROM recurring_rules 
    WHERE client_id = NEW.client_id 
      AND provider_id = NEW.provider_id 
      AND listing_id = NEW.listing_id
      AND recurrence_type = NEW.recurrence
      AND start_time = NEW.start_time::TIME
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
      
      RAISE LOG 'Created new recurring rule % for appointment % (client: %)', 
        rule_id, NEW.id, COALESCE(real_client_name, NEW.client_name);
    ELSE
      rule_id := existing_rule_id;
      RAISE LOG 'Using existing recurring rule % for appointment % (client: %)', 
        existing_rule_id, NEW.id, COALESCE(real_client_name, NEW.client_name);
    END IF;
    
    -- Update the appointment with the rule ID
    UPDATE appointments 
    SET recurring_rule_id = rule_id
    WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create improved trigger
CREATE TRIGGER trigger_create_recurring_rule
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION create_recurring_rule_from_appointment();

-- Clean up orphaned recurring rules (rules without active appointments)
UPDATE recurring_rules 
SET is_active = false 
WHERE is_active = true 
  AND id NOT IN (
    SELECT DISTINCT recurring_rule_id 
    FROM appointments 
    WHERE recurring_rule_id IS NOT NULL 
      AND status NOT IN ('cancelled', 'rejected')
  );

-- Add index for better performance on recurring rules queries
CREATE INDEX IF NOT EXISTS idx_recurring_rules_provider_active 
ON recurring_rules(provider_id, is_active, recurrence_type, start_date);

-- Add index for better appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_provider_status_time 
ON appointments(provider_id, status, start_time);

-- Log the improvements
SELECT 
  COUNT(*) as total_rules,
  COUNT(*) FILTER (WHERE is_active = true) as active_rules,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_rules
FROM recurring_rules;