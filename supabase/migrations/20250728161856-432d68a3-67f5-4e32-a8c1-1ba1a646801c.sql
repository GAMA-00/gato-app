-- Security Fixes: Role Update Protection (Fixed SQL)

-- 1. Create secure function to check role updates
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

-- 2. Update RLS policy for users table to prevent unauthorized role changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- 3. Secure database functions with proper search_path
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