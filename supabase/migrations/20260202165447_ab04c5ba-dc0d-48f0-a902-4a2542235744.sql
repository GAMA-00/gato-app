-- Fix provider_public_profiles view to bypass RLS
-- The view was created with security_invoker=true which respects RLS on users table
-- This prevented clients from seeing provider profiles

DROP VIEW IF EXISTS public.provider_public_profiles;

CREATE VIEW public.provider_public_profiles
WITH (security_invoker = false)
AS
SELECT
  u.id,
  u.name,
  u.avatar_url,
  u.about_me,
  u.experience_years,
  u.certification_files,
  COALESCE(
    (SELECT AVG(r.rating)::numeric(3,2)
     FROM public.provider_ratings r
     WHERE r.provider_id = u.id),
    0
  ) AS average_rating,
  u.created_at
FROM public.users u
WHERE u.role = 'provider';

-- Grant access to the view for all users
GRANT SELECT ON public.provider_public_profiles TO anon, authenticated;