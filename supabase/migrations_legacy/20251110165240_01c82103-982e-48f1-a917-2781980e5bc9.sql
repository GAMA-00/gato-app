-- Agregar campo is_active a usuarios
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Función RPC para que admins activen/desactiven usuarios
CREATE OR REPLACE FUNCTION public.toggle_user_active(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que sea admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admins pueden cambiar estado de usuarios';
  END IF;

  -- Toggle el estado
  UPDATE public.users
  SET is_active = NOT is_active
  WHERE id = _user_id;
END;
$$;