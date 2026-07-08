-- Update get_recurring_clients_count to only count confirmed recurring clients
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
      AND appointments.status = 'confirmed'
  );
END;
$function$