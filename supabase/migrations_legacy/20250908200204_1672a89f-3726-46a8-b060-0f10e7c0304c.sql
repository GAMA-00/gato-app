-- Ensure team-photos bucket exists and is public, and set proper storage policies similar to provider avatars

-- 1) Create bucket if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'team-photos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('team-photos', 'team-photos', true);
  END IF;
END
$$;

-- 2) Ensure bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'team-photos';

-- 3) Enable RLS on storage.objects (is enabled by default, but ensure)
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- 4) Public read access policy for team-photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Public read access for team photos'
  ) THEN
    CREATE POLICY "Public read access for team photos"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'team-photos');
  END IF;
END
$$;

-- 5) Allow authenticated users to upload their own team photos (path: userId/team/memberId.jpg)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Authenticated users can upload team photos'
  ) THEN
    CREATE POLICY "Authenticated users can upload team photos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'team-photos'
      AND auth.role() = 'authenticated'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END
$$;

-- 6) Allow authenticated users to update their own team photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Authenticated users can update team photos'
  ) THEN
    CREATE POLICY "Authenticated users can update team photos"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'team-photos'
      AND auth.role() = 'authenticated'
      AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'team-photos'
      AND auth.role() = 'authenticated'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END
$$;

-- 7) Allow authenticated users to delete their own team photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Authenticated users can delete team photos'
  ) THEN
    CREATE POLICY "Authenticated users can delete team photos"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'team-photos'
      AND auth.role() = 'authenticated'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END
$$;