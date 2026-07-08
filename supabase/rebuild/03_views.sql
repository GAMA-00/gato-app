-- ============================================================
-- REBUILD LIMPIO v1 — ETAPA 3: VISTAS
-- ============================================================
-- Adaptadas: se quitaron columnas de tablas muertas (residencia_id, condominium_id,
-- has_payment_method) → se devuelven como NULL para no romper el shape esperado por la UI.

CREATE OR REPLACE VIEW public.provider_public_profiles AS
  SELECT id, name, avatar_url, about_me, experience_years, certification_files,
    COALESCE((SELECT (avg(r.rating))::numeric(3,2) FROM provider_ratings r WHERE r.provider_id = u.id), 0::numeric) AS average_rating,
    created_at
  FROM users u WHERE role = 'provider';

CREATE OR REPLACE VIEW public.providers_view AS
  SELECT id, name, email, phone, avatar_url, role, about_me, experience_years, certification_files,
    average_rating, NULL::boolean AS has_payment_method, NULL::uuid AS residencia_id,
    NULL::uuid AS condominium_id, house_number, created_at
  FROM users u WHERE role = 'provider';

CREATE OR REPLACE VIEW public.clients_view AS
  SELECT id, name, email, phone, avatar_url, role, about_me, experience_years, certification_files,
    average_rating, NULL::boolean AS has_payment_method, NULL::uuid AS residencia_id,
    NULL::uuid AS condominium_id, house_number, created_at
  FROM users u WHERE role = 'client';

CREATE OR REPLACE VIEW public.unified_appointments AS
  SELECT a.id, a.listing_id, a.provider_id, a.client_id, NULL::uuid AS residencia_id,
    a.start_time, a.end_time, a.status, a.recurrence, a.notes, a.client_name, a.client_email,
    a.client_phone, a.client_address, a.created_at, a.is_recurring_instance, a.recurrence_group_id,
    a.external_booking, a.final_price, a.price_finalized, 'appointment'::text AS source_type,
    a.created_from, a.created_by_user
  FROM appointments a
  WHERE a.notes !~~ '%[SKIPPED BY CLIENT]%'::text
  UNION ALL
  SELECT rai.id, rr.listing_id, rr.provider_id, rr.client_id, NULL::uuid AS residencia_id,
    rai.start_time, rai.end_time, rai.status, rr.recurrence_type AS recurrence, rai.notes,
    rr.client_name, rr.client_email, rr.client_phone, rr.client_address, rai.created_at,
    true AS is_recurring_instance, rr.id AS recurrence_group_id, false AS external_booking,
    NULL::numeric AS final_price, false AS price_finalized, 'recurring_instance'::text AS source_type,
    'system'::text AS created_from, rr.client_id AS created_by_user
  FROM recurring_appointment_instances rai
  JOIN recurring_rules rr ON rai.recurring_rule_id = rr.id
  WHERE rai.notes !~~ '%[SKIPPED BY CLIENT]%'::text AND rai.notes !~~ '%[CANCELLED WITH PARENT]%'::text;
