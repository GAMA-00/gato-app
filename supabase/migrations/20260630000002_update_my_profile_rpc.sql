-- RPC para actualizar datos del perfil sin depender de RLS en users
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
    name        = p_name,
    phone       = COALESCE(p_phone, phone),
    about_me    = COALESCE(p_about_me, about_me),
    cover_theme = COALESCE(p_cover_theme, cover_theme)
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text) TO authenticated;
