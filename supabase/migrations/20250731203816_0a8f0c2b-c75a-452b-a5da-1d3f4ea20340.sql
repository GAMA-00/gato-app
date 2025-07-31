-- Limpiar políticas duplicadas para storage avatars
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;

-- Mejorar la política de upload para avatars con mejor validación
DROP POLICY IF EXISTS "avatar_authenticated_upload" ON storage.objects;
CREATE POLICY "avatar_authenticated_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Verificar que el bucket avatars existe y es público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';