-- Fix timezone inconsistency in recurring appointments
-- The issue: appointments are stored in UTC but recurring rules store local time
-- This causes 6-hour offset (13:00 UTC appointment → 13:00 local time rule = wrong)

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_create_recurring_rule ON appointments;
DROP TRIGGER IF EXISTS trigger_create_recurring_rule_insert ON appointments;
DROP FUNCTION IF EXISTS public.create_recurring_rule_from_appointment();

-- Create improved function that stores LOCAL time in recurring rules
CREATE OR REPLACE FUNCTION public.create_recurring_rule_from_appointment()
RETURNS TRIGGER AS $$
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
    -- This fixes the timezone offset issue (13:00 UTC → 07:00 local)
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
      -- Calculate day of week and day of month using LOCAL time
      day_of_week_val := EXTRACT(DOW FROM (NEW.start_time AT TIME ZONE 'America/Costa_Rica'));
      day_of_month_val := EXTRACT(DAY FROM (NEW.start_time AT TIME ZONE 'America/Costa_Rica'));
      
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
      
      RAISE LOG 'Created recurring rule % with LOCAL times %-%s for appointment % (client: %)', 
        rule_id, local_start_time, local_end_time, NEW.id, COALESCE(real_client_name, NEW.client_name);
        
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

-- Create the triggers
CREATE TRIGGER trigger_create_recurring_rule
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND OLD.status != 'confirmed')
  EXECUTE FUNCTION create_recurring_rule_from_appointment();

CREATE TRIGGER trigger_create_recurring_rule_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none')
  EXECUTE FUNCTION create_recurring_rule_from_appointment();

-- Fix existing inconsistent recurring rules
-- Find rules where the time doesn't match the actual appointment times

WITH appointment_local_times AS (
  SELECT 
    a.recurring_rule_id,
    a.id as appointment_id,
    (a.start_time AT TIME ZONE 'America/Costa_Rica')::TIME as local_start_time,
    (a.end_time AT TIME ZONE 'America/Costa_Rica')::TIME as local_end_time,
    a.client_name,
    a.start_time as utc_start_time
  FROM appointments a
  WHERE a.recurring_rule_id IS NOT NULL 
    AND a.status = 'confirmed'
    AND a.is_recurring_instance = false
)
UPDATE recurring_rules rr
SET 
  start_time = alt.local_start_time,
  end_time = alt.local_end_time,
  updated_at = now()
FROM appointment_local_times alt
WHERE rr.id = alt.recurring_rule_id
  AND (rr.start_time != alt.local_start_time OR rr.end_time != alt.local_end_time);

-- Log the corrections made
DO $$
DECLARE
  corrected_count INTEGER;
BEGIN
  -- Get count of corrected rules
  SELECT COUNT(*) INTO corrected_count
  FROM recurring_rules rr
  JOIN appointments a ON a.recurring_rule_id = rr.id
  WHERE a.status = 'confirmed' 
    AND a.is_recurring_instance = false
    AND rr.updated_at > now() - INTERVAL '1 minute';
    
  RAISE LOG 'Corrected % recurring rules to use local timezone', corrected_count;
END $$;

-- Remove any duplicate recurring rules that might have been created
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