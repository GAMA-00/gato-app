
-- Crear buckets de storage necesarios
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('certifications', 'certifications', true),
  ('service-gallery', 'service-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas permisivas para los buckets
CREATE POLICY "Anyone can view files" ON storage.objects
FOR SELECT USING (bucket_id IN ('avatars', 'certifications', 'service-gallery'));

CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id IN ('avatars', 'certifications', 'service-gallery') AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE USING (bucket_id IN ('avatars', 'certifications', 'service-gallery') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE USING (bucket_id IN ('avatars', 'certifications', 'service-gallery') AND auth.uid()::text = (storage.foldername(name))[1]);
