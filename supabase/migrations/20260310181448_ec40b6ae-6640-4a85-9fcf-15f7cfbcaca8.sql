
-- Add auth_provider column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'email';

-- Update handle_new_user to set auth_provider from the OAuth provider
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
  user_auth_provider TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  -- Determine auth provider
  user_auth_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

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
      actual_condominium_name := user_condominium_id;
      actual_condominium_id := NULL;
    END IF;
  END IF;

  -- Upsert into public.users
  INSERT INTO public.users (
    id, name, email, role, phone,
    residencia_id, condominium_id, condominium_text, condominium_name, house_number,
    avatar_url, auth_provider, created_at
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
    user_auth_provider,
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.users.name),
    email = COALESCE(EXCLUDED.email, public.users.email),
    role = public.users.role,
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    residencia_id = COALESCE(EXCLUDED.residencia_id, public.users.residencia_id),
    condominium_id = COALESCE(EXCLUDED.condominium_id, public.users.condominium_id),
    condominium_text = COALESCE(EXCLUDED.condominium_text, public.users.condominium_text),
    condominium_name = COALESCE(EXCLUDED.condominium_name, public.users.condominium_name),
    house_number = COALESCE(EXCLUDED.house_number, public.users.house_number),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    auth_provider = EXCLUDED.auth_provider;

  -- Ensure role tables
  IF user_role = 'client' THEN
    INSERT INTO public.clients (id, residencia_id)
    VALUES (NEW.id, user_residencia_id)
    ON CONFLICT (id) DO UPDATE SET residencia_id = COALESCE(EXCLUDED.residencia_id, public.clients.residencia_id);
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
