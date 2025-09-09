-- Ensure public storage bucket for team member photos and proper access policies
-- 1) Create bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'team-photos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('team-photos', 'team-photos', true);
  END IF;
END $$;

-- 2) Policies for public read and provider-managed writes
-- Public can read team member photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can read team member photos'
  ) THEN
    CREATE POLICY "Public can read team member photos"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'team-photos');
  END IF;
END $$;

-- Providers can upload their own team photos (first path segment must match their user id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Providers can upload their team photos'
  ) THEN
    CREATE POLICY "Providers can upload their team photos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'team-photos' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Providers can update their own team photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Providers can update their team photos'
  ) THEN
    CREATE POLICY "Providers can update their team photos"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'team-photos' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'team-photos' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Providers can delete their own team photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Providers can delete their team photos'
  ) THEN
    CREATE POLICY "Providers can delete their team photos"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'team-photos' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;