-- Retry migration with safe UUID handling and robust backfill

-- 1) Ensure trigger/function are fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2) Create robust handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_residencia_id UUID;
  user_condominium_id TEXT;
  user_house_number TEXT;
  actual_condominium_name TEXT;
  actual_condominium_id UUID;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  -- residenciaId (safe cast)
  BEGIN
    IF (NEW.raw_user_meta_data->>'residenciaId') ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$' THEN
      user_residencia_id := (NEW.raw_user_meta_data->>'residenciaId')::uuid;
    ELSE
      user_residencia_id := NULL;
    END IF;
  EXCEPTION WHEN others THEN
    user_residencia_id := NULL;
  END;

  user_condominium_id := NEW.raw_user_meta_data->>'condominiumId';
  user_house_number := NEW.raw_user_meta_data->>'houseNumber';

  -- Resolve condominium id/name
  IF user_condominium_id IS NOT NULL THEN
    IF user_condominium_id LIKE 'static-%' THEN
      actual_condominium_name := CASE user_condominium_id
        WHEN 'static-0' THEN 'El Carao'
        WHEN 'static-1' THEN 'La Ceiba'
        WHEN 'static-2' THEN 'Guayaquil'
        WHEN 'static-3' THEN 'Ilang-Ilang'
        WHEN 'static-4' THEN 'Nogal'
        WHEN 'static-5' THEN 'Guayacán Real'
        WHEN 'static-6' THEN 'Cedro Alto'
        WHEN 'static-7' THEN 'Roble Sabana'
        WHEN 'static-8' THEN 'Alamo'
        WHEN 'static-9' THEN 'Guaitil'
        ELSE NULL
      END;
      actual_condominium_id := NULL;
    ELSIF user_condominium_id ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$' THEN
      BEGIN
        actual_condominium_id := user_condominium_id::uuid;
        SELECT name INTO actual_condominium_name
        FROM public.condominiums
        WHERE id = actual_condominium_id;
      EXCEPTION WHEN others THEN
        actual_condominium_id := NULL;
        actual_condominium_name := user_condominium_id;
      END;
    ELSE
      -- treat as free text
      actual_condominium_name := user_condominium_id;
      actual_condominium_id := NULL;
    END IF;
  END IF;

  -- Upsert into public.users
  INSERT INTO public.users (
    id, name, email, role, phone,
    residencia_id, condominium_id, condominium_text, condominium_name, house_number,
    avatar_url, created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.email,
    user_role,
    NEW.raw_user_meta_data->>'phone',
    user_residencia_id,
    actual_condominium_id,
    CASE WHEN user_condominium_id LIKE 'static-%' THEN actual_condominium_name ELSE NULL END,
    actual_condominium_name,
    user_house_number,
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    residencia_id = EXCLUDED.residencia_id,
    condominium_id = EXCLUDED.condominium_id,
    condominium_text = EXCLUDED.condominium_text,
    condominium_name = EXCLUDED.condominium_name,
    house_number = EXCLUDED.house_number,
    avatar_url = EXCLUDED.avatar_url;

  -- Ensure role tables
  IF user_role = 'client' THEN
    INSERT INTO public.clients (id, residencia_id)
    VALUES (NEW.id, user_residencia_id)
    ON CONFLICT (id) DO UPDATE SET residencia_id = EXCLUDED.residencia_id;
  ELSIF user_role = 'provider' THEN
    INSERT INTO public.providers (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
    IF user_residencia_id IS NOT NULL THEN
      INSERT INTO public.provider_residencias (provider_id, residencia_id)
      VALUES (NEW.id, user_residencia_id)
      ON CONFLICT (provider_id, residencia_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Recreate trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Backfill existing users safely (no invalid UUID casts)
WITH auth_metadata AS (
  SELECT 
    au.id,
    CASE WHEN (au.raw_user_meta_data->>'residenciaId') ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$'
         THEN (au.raw_user_meta_data->>'residenciaId')::uuid ELSE NULL END AS residencia_id,
    au.raw_user_meta_data->>'condominiumId' AS condominium_id_raw,
    au.raw_user_meta_data->>'houseNumber' AS house_number,
    -- Precompute condominium UUID only when valid
    CASE WHEN (au.raw_user_meta_data->>'condominiumId') ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$'
         THEN (au.raw_user_meta_data->>'condominiumId')::uuid ELSE NULL END AS condominium_uuid,
    CASE 
      WHEN (au.raw_user_meta_data->>'condominiumId') LIKE 'static-%' THEN
        CASE au.raw_user_meta_data->>'condominiumId'
          WHEN 'static-0' THEN 'El Carao'
          WHEN 'static-1' THEN 'La Ceiba'
          WHEN 'static-2' THEN 'Guayaquil'
          WHEN 'static-3' THEN 'Ilang-Ilang'
          WHEN 'static-4' THEN 'Nogal'
          WHEN 'static-5' THEN 'Guayacán Real'
          WHEN 'static-6' THEN 'Cedro Alto'
          WHEN 'static-7' THEN 'Roble Sabana'
          WHEN 'static-8' THEN 'Alamo'
          WHEN 'static-9' THEN 'Guaitil'
          ELSE NULL
        END
      WHEN (au.raw_user_meta_data->>'condominiumId') ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$' THEN
        (SELECT name FROM public.condominiums WHERE id = (au.raw_user_meta_data->>'condominiumId')::uuid)
      ELSE NULL
    END AS condominium_name,
    CASE 
      WHEN (au.raw_user_meta_data->>'condominiumId') LIKE 'static-%' THEN 
        CASE au.raw_user_meta_data->>'condominiumId'
          WHEN 'static-0' THEN 'El Carao'
          WHEN 'static-1' THEN 'La Ceiba'
          WHEN 'static-2' THEN 'Guayaquil'
          WHEN 'static-3' THEN 'Ilang-Ilang'
          WHEN 'static-4' THEN 'Nogal'
          WHEN 'static-5' THEN 'Guayacán Real'
          WHEN 'static-6' THEN 'Cedro Alto'
          WHEN 'static-7' THEN 'Roble Sabana'
          WHEN 'static-8' THEN 'Alamo'
          WHEN 'static-9' THEN 'Guaitil'
          ELSE NULL
        END
      ELSE NULL
    END AS condominium_text
  FROM auth.users au
  WHERE au.raw_user_meta_data IS NOT NULL
)
UPDATE public.users u
SET 
  residencia_id = COALESCE(u.residencia_id, am.residencia_id),
  condominium_id = COALESCE(u.condominium_id, am.condominium_uuid),
  condominium_text = COALESCE(u.condominium_text, am.condominium_text),
  condominium_name = COALESCE(u.condominium_name, am.condominium_name),
  house_number = COALESCE(u.house_number, am.house_number)
FROM auth_metadata am
WHERE u.id = am.id
  AND u.role = 'client'
  AND (
    u.residencia_id IS NULL OR 
    u.condominium_name IS NULL OR 
    u.house_number IS NULL
  );

-- 5) Backfill clients.residencia_id safely
WITH auth_res AS (
  SELECT 
    au.id,
    CASE WHEN (au.raw_user_meta_data->>'residenciaId') ~ '^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$'
         THEN (au.raw_user_meta_data->>'residenciaId')::uuid ELSE NULL END AS residencia_id
  FROM auth.users au
)
UPDATE public.clients c
SET residencia_id = ar.residencia_id
FROM auth_res ar
WHERE c.id = ar.id
  AND c.residencia_id IS NULL
  AND ar.residencia_id IS NOT NULL;