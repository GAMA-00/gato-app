-- Fix storage bucket configuration for proper MIME types
-- Update storage policies to ensure proper content types
CREATE POLICY "Allow correct MIME types for avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  (metadata->>'mimetype')::text LIKE 'image/%'
);

-- Create a function to fix existing avatar MIME types
CREATE OR REPLACE FUNCTION public.fix_avatar_mime_types()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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