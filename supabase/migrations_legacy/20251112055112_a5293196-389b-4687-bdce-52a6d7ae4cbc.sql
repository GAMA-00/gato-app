-- Drop the problematic policy that's causing the deadlock
DROP POLICY IF EXISTS "Providers can view their clients profiles" ON public.users;

-- Create a better policy that allows providers to see client profiles 
-- when they have appointments, without causing performance issues
CREATE POLICY "Providers can view appointment clients"
ON public.users
FOR SELECT
USING (
  -- Allow if the user is a client AND
  -- they have at least one appointment with the requesting provider
  role = 'client'
  AND id IN (
    SELECT DISTINCT client_id
    FROM appointments
    WHERE provider_id = auth.uid()
    AND status IN ('pending', 'confirmed', 'completed')
  )
);