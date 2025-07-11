-- Update the get_recurring_clients_count function to use appointments table instead of recurring_rules
CREATE OR REPLACE FUNCTION public.get_recurring_clients_count(provider_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Count unique clients who have appointments with recurring schedules
  RETURN (
    SELECT COUNT(DISTINCT client_id)
    FROM appointments
    WHERE appointments.provider_id = $1 
      AND client_id IS NOT NULL
      AND recurrence IS NOT NULL 
      AND recurrence IN ('weekly', 'biweekly', 'monthly')
      AND status IN ('pending', 'confirmed', 'completed')
  );
END;
$function$