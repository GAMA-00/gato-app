-- Create team-photos bucket if it doesn't exist and set up proper RLS policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create RLS policies for team-photos bucket to allow public read access
CREATE POLICY "Public can view team photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'team-photos');

-- Allow providers to upload/update their team member photos
CREATE POLICY "Providers can upload team photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'team-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow providers to update their team member photos
CREATE POLICY "Providers can update team photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'team-photos'
  AND auth.role() = 'authenticated' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow providers to delete their team member photos
CREATE POLICY "Providers can delete team photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'team-photos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);