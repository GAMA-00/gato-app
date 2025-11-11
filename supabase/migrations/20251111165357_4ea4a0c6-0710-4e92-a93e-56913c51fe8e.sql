-- ============================================
-- Fix Security Definer Views
-- Convert all views to SECURITY INVOKER to use querying user's permissions
-- ============================================

-- Drop existing views
DROP VIEW IF EXISTS public.unified_appointments CASCADE;
DROP VIEW IF EXISTS public.provider_public_profiles CASCADE;
DROP VIEW IF EXISTS public.clients_view CASCADE;
DROP VIEW IF EXISTS public.providers_view CASCADE;

-- ============================================
-- 1. Recreate unified_appointments view with SECURITY INVOKER
-- ============================================
CREATE VIEW public.unified_appointments 
WITH (security_invoker = true)
AS
SELECT 
  a.id,
  a.listing_id,
  a.provider_id,
  a.client_id,
  a.residencia_id,
  a.start_time,
  a.end_time,
  a.status,
  a.recurrence,
  a.notes,
  a.client_name,
  a.client_email,
  a.client_phone,
  a.client_address,
  a.created_at,
  a.is_recurring_instance,
  a.recurrence_group_id,
  a.external_booking,
  a.final_price,
  a.price_finalized,
  'appointment' as source_type,
  a.created_from,
  a.created_by_user
FROM appointments a
WHERE a.notes NOT LIKE '%[SKIPPED BY CLIENT]%'

UNION ALL

SELECT 
  rai.id,
  rr.listing_id,
  rr.provider_id,
  rr.client_id,
  NULL as residencia_id,
  rai.start_time,
  rai.end_time,
  rai.status,
  rr.recurrence_type as recurrence,
  rai.notes,
  rr.client_name,
  rr.client_email,
  rr.client_phone,
  rr.client_address,
  rai.created_at,
  true as is_recurring_instance,
  rr.id as recurrence_group_id,
  false as external_booking,
  NULL as final_price,
  false as price_finalized,
  'recurring_instance' as source_type,
  'system' as created_from,
  rr.client_id as created_by_user
FROM recurring_appointment_instances rai
JOIN recurring_rules rr ON rai.recurring_rule_id = rr.id
WHERE rai.notes NOT LIKE '%[SKIPPED BY CLIENT]%'
  AND rai.notes NOT LIKE '%[CANCELLED WITH PARENT]%';

-- Grant access to authenticated users (RLS from underlying tables will apply)
GRANT SELECT ON public.unified_appointments TO authenticated;

-- ============================================
-- 2. Recreate provider_public_profiles with SECURITY INVOKER
-- ============================================
CREATE VIEW public.provider_public_profiles
WITH (security_invoker = true)
AS
SELECT 
  u.id,
  u.name,
  u.avatar_url,
  u.about_me,
  u.experience_years,
  u.certification_files,
  COALESCE(
    (SELECT AVG(rating)::numeric(3,2) 
     FROM provider_ratings 
     WHERE provider_id = u.id), 
    0
  ) as average_rating,
  u.created_at
FROM public.users u
WHERE u.role = 'provider';

-- Allow public read on provider profiles (safe, non-sensitive data only)
GRANT SELECT ON public.provider_public_profiles TO anon, authenticated;

-- ============================================
-- 3. Recreate clients_view with SECURITY INVOKER
-- ============================================
CREATE VIEW public.clients_view
WITH (security_invoker = true)
AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone,
  u.avatar_url,
  u.role,
  u.about_me,
  u.experience_years,
  u.certification_files,
  u.average_rating,
  u.has_payment_method,
  u.residencia_id,
  u.condominium_id,
  u.house_number,
  u.created_at
FROM public.users u
WHERE u.role = 'client';

-- Grant access (RLS from users table will apply)
GRANT SELECT ON public.clients_view TO authenticated;

-- ============================================
-- 4. Recreate providers_view with SECURITY INVOKER
-- ============================================
CREATE VIEW public.providers_view
WITH (security_invoker = true)
AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone,
  u.avatar_url,
  u.role,
  u.about_me,
  u.experience_years,
  u.certification_files,
  u.average_rating,
  u.has_payment_method,
  u.residencia_id,
  u.condominium_id,
  u.house_number,
  u.created_at
FROM public.users u
WHERE u.role = 'provider';

-- Grant access (RLS from users table will apply)
GRANT SELECT ON public.providers_view TO authenticated;