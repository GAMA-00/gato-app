-- Create function to count recurring clients for a specific listing/service
CREATE OR REPLACE FUNCTION public.get_recurring_clients_count_by_listing(provider_id uuid, listing_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Count unique clients who have active recurring appointments for this specific listing
  RETURN (
    SELECT COUNT(DISTINCT client_id)
    FROM appointments
    WHERE provider_id = $1 
      AND listing_id = $2
      AND client_id IS NOT NULL
      AND recurrence IS NOT NULL 
      AND recurrence != 'none'
      AND recurrence != ''
      AND status IN ('pending', 'confirmed')
  );
END;
$function$