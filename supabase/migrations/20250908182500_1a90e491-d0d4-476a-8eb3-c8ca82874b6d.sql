-- Delete existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view team photos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can upload team photos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update their team photos" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete their team photos" ON storage.objects;

-- Ensure bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'team-photos';

-- Create clean RLS policies for team-photos bucket
CREATE POLICY "Public access to team photos" ON storage.objects
FOR SELECT USING (bucket_id = 'team-photos');

CREATE POLICY "Authenticated users can upload team photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'team-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update team photos in their folder" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'team-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete team photos in their folder" ON storage.objects
FOR DELETE USING (
  bucket_id = 'team-photos' AND
  auth.role() = 'authenticated'
);