-- Create team-photos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for team-photos bucket
CREATE POLICY "Anyone can view team photos" ON storage.objects
FOR SELECT USING (bucket_id = 'team-photos');

CREATE POLICY "Providers can upload team photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'team-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers can update their team photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'team-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers can delete their team photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'team-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);