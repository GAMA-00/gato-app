-- Drop restrictive SELECT policy that prevents clients from seeing blocked slots
DROP POLICY IF EXISTS "Public can view available slots" ON provider_time_slots;

-- Create new SELECT policy that allows reading all slots within booking window
-- This ensures both providers and clients can see blocked slots
CREATE POLICY "Anyone can view slots within booking window"
ON provider_time_slots
FOR SELECT
TO public
USING (
  slot_datetime_start >= now() - interval '1 day'
  AND slot_datetime_start <= now() + interval '1 year'
);

-- Create INSERT policy for providers to create their own slots
CREATE POLICY "Providers can insert own slots"
ON provider_time_slots
FOR INSERT
TO authenticated
WITH CHECK (provider_id = auth.uid());

-- Create UPDATE policy for providers to modify their own slots
CREATE POLICY "Providers can update own slots"
ON provider_time_slots
FOR UPDATE
TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

-- Create DELETE policy for providers to delete their own slots
CREATE POLICY "Providers can delete own slots"
ON provider_time_slots
FOR DELETE
TO authenticated
USING (provider_id = auth.uid());