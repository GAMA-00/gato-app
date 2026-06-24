-- Check current RLS policies for appointments
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'appointments' 
ORDER BY policyname;

-- Create new RLS policy for providers to update appointments to confirmed status
DROP POLICY IF EXISTS "Providers can update appointments they own" ON appointments;

CREATE POLICY "Providers can update appointments they own"
ON appointments
FOR UPDATE
TO authenticated
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Also ensure providers can read their appointments
DROP POLICY IF EXISTS "Providers can view their appointments" ON appointments;

CREATE POLICY "Providers can view their appointments"
ON appointments
FOR SELECT
TO authenticated
USING (auth.uid() = provider_id);

-- Check that the appointment exists and verify provider access
SELECT id, provider_id, client_id, status, start_time, end_time
FROM appointments 
WHERE id = '32178fbe-c9bd-425e-b728-764a260a8a98';

-- Test if the provider can update the appointment
SELECT auth.uid() as current_user_id;