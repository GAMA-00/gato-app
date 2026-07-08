-- Update the trigger to automatically generate instances when rules are created
DROP TRIGGER IF EXISTS auto_generate_recurring_instances_trigger ON recurring_rules;

-- Update the trigger function to generate instances immediately
CREATE OR REPLACE FUNCTION public.auto_generate_recurring_instances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  instances_created INTEGER;
BEGIN
  -- Only generate for new active recurring rules
  IF NEW.is_active = true AND NEW.recurrence_type IN ('weekly', 'biweekly', 'monthly') THEN
    -- Generate instances for the next 12 weeks
    SELECT generate_recurring_appointment_instances(NEW.id, 12) INTO instances_created;
    RAISE LOG 'Auto-generated % instances for new rule %', instances_created, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER auto_generate_recurring_instances_trigger
  AFTER INSERT OR UPDATE ON recurring_rules
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_recurring_instances();