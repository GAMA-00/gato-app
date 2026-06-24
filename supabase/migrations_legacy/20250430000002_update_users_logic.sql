
-- Update trigger function to handle user data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_role TEXT := 'client';
BEGIN
  -- Get role from metadata or use default
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    default_role := NEW.raw_user_meta_data->>'role';
  END IF;

  -- Insert into users table with error handling
  BEGIN
    INSERT INTO public.users (
      id, 
      name, 
      email, 
      role, 
      phone,
      residencia_id,
      condominium_id,
      house_number
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      NEW.email,
      default_role,
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      NULLIF(NEW.raw_user_meta_data->>'residenciaId', '')::uuid,
      NULLIF(NEW.raw_user_meta_data->>'condominiumId', '')::uuid,
      COALESCE(NEW.raw_user_meta_data->>'houseNumber', '')
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- If already exists, update
      UPDATE public.users
      SET
        name = COALESCE(NEW.raw_user_meta_data->>'name', name),
        email = COALESCE(NEW.email, email),
        role = default_role,
        phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
        residencia_id = COALESCE(NULLIF(NEW.raw_user_meta_data->>'residenciaId', '')::uuid, residencia_id),
        condominium_id = COALESCE(NULLIF(NEW.raw_user_meta_data->>'condominiumId', '')::uuid, condominium_id),
        house_number = COALESCE(NEW.raw_user_meta_data->>'houseNumber', house_number)
      WHERE id = NEW.id;
    WHEN others THEN
      -- Log any other error but allow user creation
      RAISE LOG 'Error inserting user in users table: %', SQLERRM;
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

-- Drop the obsolete function and trigger that caused the "building_id" error
DROP FUNCTION IF EXISTS public.handle_user_role_insert() CASCADE;
DROP TRIGGER IF EXISTS on_user_created ON public.users;
