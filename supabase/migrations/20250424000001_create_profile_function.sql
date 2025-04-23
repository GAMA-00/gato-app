
-- Función para crear un perfil de usuario desde el backend
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  user_role TEXT,
  user_building_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    email,
    phone,
    role,
    building_id,
    has_payment_method
  ) VALUES (
    user_id,
    user_name,
    user_email,
    user_phone,
    user_role,
    user_building_id,
    false
  );
EXCEPTION 
  WHEN unique_violation THEN
    -- Si ya existe el perfil, actualizarlo
    UPDATE public.profiles
    SET 
      name = user_name,
      email = user_email,
      phone = user_phone,
      role = user_role,
      building_id = user_building_id
    WHERE id = user_id;
END;
$$;

-- Asegurarse de que las políticas RLS no interfieran con esta función
GRANT EXECUTE ON FUNCTION public.create_user_profile TO anon, authenticated, service_role;

