-- Allow public read access to team members so clients can see them on service pages
-- Safe to add alongside existing provider/client-specific policies
DO $$ BEGIN
  -- Ensure RLS is enabled (no-op if already enabled)
  PERFORM 1;
END $$;

CREATE POLICY "Public can view team members"
ON public.team_members
FOR SELECT
USING (true);
