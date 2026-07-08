-- Storage: buckets públicos (avatars, service-gallery, Certification Documents) + políticas RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar upload own" ON storage.objects;
CREATE POLICY "Avatar upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
CREATE POLICY "Avatar update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar delete own" ON storage.objects;
CREATE POLICY "Avatar delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Bucket galería de servicios
INSERT INTO storage.buckets (id, name, public) VALUES ('service-gallery', 'service-gallery', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "Gallery upload own" ON storage.objects;
CREATE POLICY "Gallery upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'service-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Gallery update own" ON storage.objects;
CREATE POLICY "Gallery update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'service-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Gallery delete own" ON storage.objects;
CREATE POLICY "Gallery delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'service-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Gallery public read" ON storage.objects;
CREATE POLICY "Gallery public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'service-gallery');

-- Bucket certificaciones
INSERT INTO storage.buckets (id, name, public) VALUES ('Certification Documents', 'Certification Documents', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "Cert upload own" ON storage.objects;
CREATE POLICY "Cert upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'Certification Documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Cert update own" ON storage.objects;
CREATE POLICY "Cert update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'Certification Documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Cert delete own" ON storage.objects;
CREATE POLICY "Cert delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'Certification Documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Cert public read" ON storage.objects;
CREATE POLICY "Cert public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'Certification Documents');
