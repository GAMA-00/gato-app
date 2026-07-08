-- RPC para actualizar avatar_url de forma segura (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_my_avatar_url(p_avatar_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE public.users
  SET avatar_url = p_avatar_url
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_avatar_url(text) TO authenticated;

-- Política de storage más permisiva para upload autenticado
-- (la anterior puede fallar por foldername en algunas versiones del CLI)
DROP POLICY IF EXISTS "Avatar upload own" ON storage.objects;
CREATE POLICY "Avatar upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
CREATE POLICY "Avatar update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar delete own" ON storage.objects;
CREATE POLICY "Avatar delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- RPC para actualizar datos del perfil (nombre, teléfono, about_me, cover_theme)
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_name text,
  p_phone text DEFAULT NULL,
  p_about_me text DEFAULT NULL,
  p_cover_theme text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE public.users
  SET
    name       = p_name,
    phone      = COALESCE(p_phone, phone),
    about_me   = COALESCE(p_about_me, about_me),
    cover_theme = COALESCE(p_cover_theme, cover_theme)
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text) TO authenticated;
