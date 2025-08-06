-- Run migration for existing recurring appointments
SELECT migrate_existing_recurring_appointments();

-- Add real-time subscription for provider_time_slots table
ALTER TABLE provider_time_slots REPLICA IDENTITY FULL;

-- Add the table to realtime publication
DO $$
BEGIN
  -- Check if the table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'provider_time_slots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE provider_time_slots;
  END IF;
END
$$;