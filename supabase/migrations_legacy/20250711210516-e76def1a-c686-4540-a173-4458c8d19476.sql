-- Fix the get_recurring_clients_count function with fully qualified column names
CREATE OR REPLACE FUNCTION public.get_recurring_clients_count(provider_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT appointments.client_id)
    FROM appointments
    WHERE appointments.provider_id = $1 
      AND appointments.client_id IS NOT NULL
      AND appointments.recurrence IS NOT NULL 
      AND appointments.recurrence IN ('weekly', 'biweekly', 'monthly')
      AND appointments.status IN ('pending', 'confirmed', 'completed')
  );
END;
$function$