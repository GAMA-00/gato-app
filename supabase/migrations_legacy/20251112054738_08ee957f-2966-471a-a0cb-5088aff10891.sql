-- Allow providers to view client profiles when they have appointments together
CREATE POLICY "Providers can view their clients profiles"
ON public.users
FOR SELECT
USING (
  role = 'client' 
  AND EXISTS (
    SELECT 1 
    FROM appointments 
    WHERE appointments.provider_id = auth.uid()
    AND appointments.client_id = users.id
    AND appointments.status IN ('pending', 'confirmed', 'completed')
  )
);