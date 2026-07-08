-- Security Fixes: Critical RLS and Database Security Issues

-- 1. Enable RLS on all public tables that need it
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_appointment_instances ENABLE ROW LEVEL SECURITY;

-- 2. Add constraint to prevent direct role updates by regular users
-- Create a secure function to check if user can update roles
CREATE OR REPLACE FUNCTION public.can_update_user_role(target_user_id uuid, new_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow role updates by the user themselves for specific cases
  -- or by system/admin functions
  IF auth.uid() = target_user_id AND new_role IN ('client', 'provider') THEN
    RETURN true;
  END IF;
  
  -- System role can always update
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 3. Secure database functions by adding search_path
CREATE OR REPLACE FUNCTION public.create_user_profile(user_id uuid, user_name text, user_email text, user_phone text, user_role text, user_residencia_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table (keep for now as a base reference)
  INSERT INTO profiles (
    id, name, email, phone, role, residencia_id
  ) VALUES (
    user_id, user_name, user_email, user_phone, user_role, user_residencia_id
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = user_name,
    email = user_email,
    phone = user_phone,
    role = user_role,
    residencia_id = user_residencia_id;
    
  -- Also insert into the appropriate role-specific table
  IF user_role = 'client' THEN
    INSERT INTO clients (id, residencia_id)
    VALUES (user_id, user_residencia_id)
    ON CONFLICT (id) DO UPDATE
    SET residencia_id = user_residencia_id;
  ELSIF user_role = 'provider' THEN
    INSERT INTO providers (id)
    VALUES (user_id)
    ON CONFLICT (id) DO NOTHING;
    
    -- If residencia_id is provided for a provider, insert into provider_residencias
    IF user_residencia_id IS NOT NULL THEN
      INSERT INTO provider_residencias (provider_id, residencia_id)
      VALUES (user_id, user_residencia_id)
      ON CONFLICT (provider_id, residencia_id) DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- 4. Update other security definer functions with proper search_path
CREATE OR REPLACE FUNCTION public.submit_provider_rating(p_provider_id uuid, p_client_id uuid, p_appointment_id uuid, p_rating integer, p_comment text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the rating with optional comment
  INSERT INTO provider_ratings 
    (provider_id, client_id, appointment_id, rating, comment, created_at)
  VALUES 
    (p_provider_id, p_client_id, p_appointment_id, p_rating, p_comment, now())
  ON CONFLICT (appointment_id) 
  DO UPDATE SET 
    rating = p_rating,
    comment = p_comment,
    created_at = now();
  
  -- Update provider's average rating with base 5-star logic
  -- Only count ratings from COMPLETED appointments
  -- Formula: (5 + sum of real ratings) / (count of real ratings + 1)
  WITH provider_avg AS (
    SELECT 
      (5.0 + SUM(pr.rating::numeric)) / (COUNT(*) + 1) as avg_rating,
      COUNT(*) as rating_count
    FROM provider_ratings pr
    JOIN appointments a ON pr.appointment_id = a.id
    WHERE pr.provider_id = p_provider_id
    AND a.status = 'completed'
  )
  UPDATE users
  SET average_rating = ROUND(provider_avg.avg_rating, 1)
  FROM provider_avg
  WHERE users.id = p_provider_id;
END;
$$;

-- 5. Fix the handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role TEXT := 'client';
  user_name TEXT;
  user_phone TEXT;
  user_residencia_id UUID;
  user_condominium_id TEXT;
  user_condominium_name TEXT;
  user_house_number TEXT;
  user_avatar_url TEXT;
  actual_condominium_name TEXT;
  provider_residencia_ids TEXT[];
  residencia_id UUID;
BEGIN
  -- Get role from metadata or use default
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    default_role := NEW.raw_user_meta_data->>'role';
  END IF;

  -- Extract metadata with better handling
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_avatar_url := COALESCE(NEW.raw_user_meta_data->>'avatarUrl', '');
  
  -- Handle UUID fields with proper conversion
  BEGIN
    user_residencia_id := CASE 
      WHEN NEW.raw_user_meta_data->>'residenciaId' IS NOT NULL 
      AND NEW.raw_user_meta_data->>'residenciaId' != '' 
      THEN (NEW.raw_user_meta_data->>'residenciaId')::uuid 
      ELSE NULL 
    END;
  EXCEPTION
    WHEN invalid_text_representation THEN
      user_residencia_id := NULL;
  END;

  -- Handle condominium data
  user_condominium_id := COALESCE(NEW.raw_user_meta_data->>'condominiumId', '');
  user_condominium_name := COALESCE(NEW.raw_user_meta_data->>'condominiumName', '');
  user_house_number := COALESCE(NEW.raw_user_meta_data->>'houseNumber', '');

  -- If we have a condominium ID, try to get the actual name from the database
  IF user_condominium_id IS NOT NULL AND user_condominium_id != '' THEN
    -- Check if it's a static condominium (starts with 'static-')
    IF user_condominium_id LIKE 'static-%' THEN
      -- Extract the index and get the name from predefined list
      DECLARE
        static_index INTEGER;
        condominium_names TEXT[] := ARRAY['El Carao', 'La Ceiba', 'Guayaquil', 'Ilang-Ilang', 'Nogal', 'Guayacán Real', 'Cedro Alto', 'Roble Sabana', 'Alamo', 'Guaitil'];
      BEGIN
        static_index := CAST(SUBSTRING(user_condominium_id FROM 8) AS INTEGER) + 1;
        IF static_index >= 1 AND static_index <= array_length(condominium_names, 1) THEN
          actual_condominium_name := condominium_names[static_index];
        END IF;
      EXCEPTION
        WHEN others THEN
          actual_condominium_name := user_condominium_name;
      END;
    ELSE
      -- Try to get from condominiums table
      BEGIN
        SELECT name INTO actual_condominium_name
        FROM public.condominiums
        WHERE id = user_condominium_id::uuid;
      EXCEPTION
        WHEN others THEN
          actual_condominium_name := user_condominium_name;
      END;
    END IF;
  END IF;

  -- Use the resolved name or fallback to the provided name
  actual_condominium_name := COALESCE(actual_condominium_name, user_condominium_name);

  -- Log the metadata for debugging
  RAISE LOG 'Creating user with metadata: name=%, email=%, phone=%, role=%, condominium_name=%, house=%, residencia=%, avatar=%', 
    user_name, NEW.email, user_phone, default_role, actual_condominium_name, user_house_number, user_residencia_id, user_avatar_url;

  -- Insert into users table with error handling
  BEGIN
    INSERT INTO public.users (
      id, 
      name, 
      email, 
      role, 
      phone,
      residencia_id,
      condominium_text,
      condominium_name,
      house_number,
      avatar_url
    ) VALUES (
      NEW.id,
      user_name,
      NEW.email,
      default_role,
      user_phone,
      user_residencia_id,
      actual_condominium_name,
      actual_condominium_name,
      user_house_number,
      user_avatar_url
    );
    
    RAISE LOG 'User inserted successfully with ID: % and avatar: %', NEW.id, user_avatar_url;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- If already exists, update with new data
      RAISE LOG 'User already exists, updating data for ID: %', NEW.id;
      UPDATE public.users
      SET
        name = COALESCE(user_name, name),
        email = COALESCE(NEW.email, email),
        role = default_role,
        phone = COALESCE(user_phone, phone),
        residencia_id = COALESCE(user_residencia_id, residencia_id),
        condominium_text = COALESCE(actual_condominium_name, condominium_text),
        condominium_name = COALESCE(actual_condominium_name, condominium_name),
        house_number = COALESCE(user_house_number, house_number),
        avatar_url = COALESCE(user_avatar_url, avatar_url)
      WHERE id = NEW.id;
    WHEN others THEN
      -- Log any other error but allow user creation
      RAISE LOG 'Error inserting user in users table: %, SQLSTATE: %', SQLERRM, SQLSTATE;
  END;

  -- Handle provider residencias if user is a provider
  IF default_role = 'provider' AND NEW.raw_user_meta_data ? 'providerResidenciaIds' THEN
    -- Extract provider residencia IDs from JSON array
    BEGIN
      SELECT array_agg(value::text) INTO provider_residencia_ids
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'providerResidenciaIds');
      
      RAISE LOG 'Processing provider residencias: %', provider_residencia_ids;
      
      -- Insert each residencia association
      IF provider_residencia_ids IS NOT NULL AND array_length(provider_residencia_ids, 1) > 0 THEN
        FOREACH residencia_id IN ARRAY provider_residencia_ids::uuid[]
        LOOP
          BEGIN
            INSERT INTO public.provider_residencias (provider_id, residencia_id)
            VALUES (NEW.id, residencia_id)
            ON CONFLICT (provider_id, residencia_id) DO NOTHING;
            
            RAISE LOG 'Inserted provider_residencia: provider=%, residencia=%', NEW.id, residencia_id;
          EXCEPTION
            WHEN others THEN
              RAISE LOG 'Error inserting provider_residencia: %, SQLSTATE: %', SQLERRM, SQLSTATE;
          END;
        END LOOP;
      END IF;
    EXCEPTION
      WHEN others THEN
        RAISE LOG 'Error processing provider residencias: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Create storage policies for avatars bucket (if not already created)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);