-- Agrega service_type_name al RPC get_provider_by_slug
DROP FUNCTION IF EXISTS public.get_provider_by_slug(text);
CREATE FUNCTION public.get_provider_by_slug(p_slug text)
RETURNS TABLE(
  id uuid, name text, slug text, avatar_url text,
  about_me text, experience_years integer, average_rating numeric,
  canton_base_id integer, certification_files jsonb, cover_theme text,
  service_type_name text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id, u.name, u.slug, u.avatar_url, u.about_me,
         u.experience_years, u.average_rating, u.canton_base_id,
         u.certification_files, u.cover_theme,
         (SELECT st.name
          FROM public.listings l
          JOIN public.service_types st ON st.id = l.service_type_id
          WHERE l.provider_id = u.id AND l.is_active = true
          ORDER BY l.created_at
          LIMIT 1) AS service_type_name
  FROM public.users u
  WHERE u.slug = p_slug AND u.role = 'provider' AND u.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_by_slug(text) TO anon, authenticated;
