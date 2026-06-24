-- Paso 1: Limpiar TODAS las políticas existentes del bucket avatars de forma más específica
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Buscar y eliminar todas las políticas relacionadas con el bucket avatars
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%avatar%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
    
    -- También eliminar políticas genéricas que podrían estar afectando avatars
    DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
END $$;

-- Paso 2: Crear políticas RLS limpias y coherentes para avatars
CREATE POLICY "avatar_public_read" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "avatar_authenticated_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (metadata->>'mimetype')::text IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp')
);

CREATE POLICY "avatar_user_update" 
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

CREATE POLICY "avatar_user_delete" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Paso 3: Ejecutar función para corregir archivos existentes con MIME type incorrecto
SELECT fix_avatar_mime_types();