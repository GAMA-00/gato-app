-- Security Fixes: Critical RLS and Database Security Issues (Fixed)

-- 1. Enable RLS on all public tables that need it (if not already enabled)
DO $$
BEGIN
  -- Enable RLS on users table if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

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

-- 3. Update RLS policy for users table to prevent unauthorized role changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can update their own profile (secure)" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND (
    -- Allow all updates except role changes, or verify role changes are allowed
    OLD.role = NEW.role OR 
    public.can_update_user_role(id, NEW.role)
  )
);

-- 4. Secure remaining database functions with search_path
CREATE OR REPLACE FUNCTION public.fix_avatar_mime_types()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fixed_count INTEGER := 0;
  avatar_record RECORD;
BEGIN
  -- Find all avatar objects with incorrect MIME types
  FOR avatar_record IN 
    SELECT name, id
    FROM storage.objects 
    WHERE bucket_id = 'avatars' 
    AND (metadata->>'mimetype')::text = 'application/json'
  LOOP
    -- Update the MIME type based on file extension
    UPDATE storage.objects
    SET metadata = jsonb_set(
      metadata,
      '{mimetype}',
      CASE 
        WHEN avatar_record.name LIKE '%.jpg' OR avatar_record.name LIKE '%.jpeg' THEN '"image/jpeg"'
        WHEN avatar_record.name LIKE '%.png' THEN '"image/png"'
        WHEN avatar_record.name LIKE '%.webp' THEN '"image/webp"'
        ELSE '"image/jpeg"' -- default fallback
      END::jsonb
    )
    WHERE id = avatar_record.id;
    
    fixed_count := fixed_count + 1;
  END LOOP;
  
  RETURN fixed_count;
END;
$$;

-- 5. Update other functions with search_path
CREATE OR REPLACE FUNCTION public.recalculate_all_provider_ratings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER := 0;
  provider_record RECORD;
BEGIN
  -- For each provider that has ratings from completed appointments
  FOR provider_record IN 
    SELECT 
      pr.provider_id,
      (5.0 + SUM(pr.rating::numeric)) / (COUNT(*) + 1) as avg_rating,
      COUNT(*) as rating_count
    FROM provider_ratings pr
    JOIN appointments a ON pr.appointment_id = a.id
    WHERE a.status = 'completed'
    GROUP BY pr.provider_id
  LOOP
    -- Update the average in the users table with the new logic
    UPDATE users
    SET average_rating = ROUND(provider_record.avg_rating, 1)
    WHERE id = provider_record.provider_id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- 6. Storage policies (only create if not exists)
DO $$
BEGIN
  -- Create storage bucket if not exists
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('avatars', 'avatars', true) 
  ON CONFLICT (id) DO NOTHING;
  
  -- Only create policies if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'avatars');
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Ignore policy creation errors if they already exist
    NULL;
END $$;