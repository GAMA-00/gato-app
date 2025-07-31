-- Paso 1: Limpiar políticas RLS conflictivas en el bucket avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Crear políticas RLS limpias y coherentes para avatars
CREATE POLICY "Public avatar access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (metadata->>'mimetype')::text IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp')
);

CREATE POLICY "Users can update their own avatars" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
) 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (metadata->>'mimetype')::text IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp')
);

CREATE POLICY "Users can delete their own avatars" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Paso 3: Ejecutar función para corregir archivos existentes con MIME type incorrecto
SELECT fix_avatar_mime_types();