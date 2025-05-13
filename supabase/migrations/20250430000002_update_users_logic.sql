
-- Update trigger function to handle user data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_role TEXT := 'client';
BEGIN
  -- Obtenemos el rol desde los metadatos o usamos el valor por defecto
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    default_role := NEW.raw_user_meta_data->>'role';
  END IF;

  -- Insertamos en la tabla users con manejo de posibles errores
  BEGIN
    INSERT INTO public.users (
      id, 
      name, 
      email, 
      role, 
      phone
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      NEW.email,
      default_role,
      COALESCE(NEW.raw_user_meta_data->>'phone', '')
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Si ya existe, actualizamos
      UPDATE public.users
      SET
        name = COALESCE(NEW.raw_user_meta_data->>'name', name),
        email = COALESCE(NEW.email, email),
        role = default_role,
        phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone)
      WHERE id = NEW.id;
    WHEN others THEN
      -- Registramos cualquier otro error pero permitimos que el usuario se cree
      RAISE LOG 'Error al insertar usuario en users: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Make sure the trigger is correctly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
