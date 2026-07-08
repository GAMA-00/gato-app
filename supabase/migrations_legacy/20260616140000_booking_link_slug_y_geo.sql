-- Booking link público (concepto v1) — F3
-- Agrega: users.slug (gato.app/{slug}), columnas geo en appointments para capturar la
-- ubicación del cliente, y RPCs públicos para resolver proveedor por slug y crear la
-- reserva de invitado. Ver docs/CONCEPTO_V1.md §5.2/§5.3 y §7 del spec.
--
-- Reusa lo que ya existe: external_booking en appointments + política RLS de insert
-- público (external_booking=true, status='pending'), provider_time_slots con lectura
-- pública, listings públicos.

-- ============================================================
-- 1. SLUG DEL PROVEEDOR
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_slug ON public.users(slug) WHERE slug IS NOT NULL;

-- Genera un slug único a partir de un nombre (sin acentos, minúsculas, guiones).
-- Si ya existe, agrega sufijo numérico (-2, -3, ...). No editable en v1 (spec O-7).
CREATE OR REPLACE FUNCTION public.generate_unique_slug(p_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_base text;
  v_slug text;
  v_n integer := 1;
BEGIN
  -- normalizar: quitar acentos comunes, minúsculas, no-alfanumérico → guion
  v_base := lower(translate(coalesce(p_name, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  IF v_base = '' THEN
    v_base := 'proveedor';
  END IF;

  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.users WHERE slug = v_slug) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  END LOOP;
  RETURN v_slug;
END;
$$;

-- Trigger: asigna slug a los proveedores sin slug (al crear o al volverse proveedor)
CREATE OR REPLACE FUNCTION public.set_provider_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'provider' AND (NEW.slug IS NULL OR NEW.slug = '') THEN
    NEW.slug := public.generate_unique_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_provider_slug ON public.users;
CREATE TRIGGER trg_set_provider_slug
  BEFORE INSERT OR UPDATE OF role, name ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_provider_slug();

-- Backfill de proveedores existentes
DO $backfill$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, name FROM public.users WHERE role = 'provider' AND (slug IS NULL OR slug = '') LOOP
    UPDATE public.users SET slug = public.generate_unique_slug(r.name) WHERE id = r.id;
  END LOOP;
END;
$backfill$;

-- ============================================================
-- 2. UBICACIÓN DEL CLIENTE EN LA CITA (geo, aditivo)
-- ============================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS canton_id integer REFERENCES public.cantones(id),
  ADD COLUMN IF NOT EXISTS client_lat double precision,
  ADD COLUMN IF NOT EXISTS client_lng double precision,
  ADD COLUMN IF NOT EXISTS address_detail jsonb;  -- { house_number, color_senas, referencias }

CREATE INDEX IF NOT EXISTS idx_appointments_canton ON public.appointments(canton_id);

-- ============================================================
-- 3. RPC: resolver proveedor por slug (público, datos seguros)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_provider_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  avatar_url text,
  about_me text,
  experience_years integer,
  average_rating numeric,
  canton_base_id integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id, u.name, u.slug, u.avatar_url, u.about_me,
         u.experience_years, u.average_rating, u.canton_base_id
  FROM public.users u
  WHERE u.slug = p_slug AND u.role = 'provider' AND u.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_by_slug(text) TO anon, authenticated;

-- ============================================================
-- 4. RPC: crear reserva de invitado (booking link público)
-- ============================================================
-- SECURITY DEFINER para que anon pueda crear la solicitud de forma controlada.
-- Marca external_booking=true, status='pending', client_id NULL. Reserva los slots
-- (misma lógica que create_appointment_with_slot_extended) y guarda geo del cliente.
CREATE OR REPLACE FUNCTION public.create_external_booking(
  p_provider_id uuid,
  p_listing_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_client_name text,
  p_client_phone text,
  p_notes text DEFAULT '',
  p_client_address text DEFAULT NULL,
  p_canton_id integer DEFAULT NULL,
  p_client_lat double precision DEFAULT NULL,
  p_client_lng double precision DEFAULT NULL,
  p_address_detail jsonb DEFAULT NULL,
  p_final_price numeric DEFAULT NULL,
  p_total_duration integer DEFAULT NULL
)
RETURNS TABLE (appointment_id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment_id uuid;
  v_conflict_count integer;
  v_required_slots integer := 1;
  v_slot_minutes integer := 30;
  v_i integer;
  v_current timestamptz;
BEGIN
  IF p_provider_id IS NULL OR p_listing_id IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
    RAISE EXCEPTION 'Faltan parámetros requeridos';
  END IF;
  IF coalesce(p_client_name, '') = '' OR coalesce(p_client_phone, '') = '' THEN
    RAISE EXCEPTION 'Nombre y WhatsApp del cliente son requeridos';
  END IF;

  -- Validar que el proveedor existe y está activo
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_provider_id AND role = 'provider' AND is_active = true) THEN
    RAISE EXCEPTION 'Proveedor no válido';
  END IF;

  IF p_total_duration IS NOT NULL AND p_total_duration > v_slot_minutes THEN
    v_required_slots := CEIL(p_total_duration::numeric / v_slot_minutes);
  END IF;

  -- Conflicto con citas existentes
  SELECT COUNT(*) INTO v_conflict_count
  FROM appointments a
  WHERE a.provider_id = p_provider_id
    AND a.status IN ('pending', 'confirmed')
    AND (
      (a.start_time <= p_start_time AND a.end_time > p_start_time) OR
      (a.start_time < p_end_time AND a.end_time >= p_end_time) OR
      (a.start_time >= p_start_time AND a.end_time <= p_end_time)
    );
  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'El horario ya no está disponible';
  END IF;

  INSERT INTO appointments (
    provider_id, listing_id, client_id, start_time, end_time,
    status, recurrence, notes, client_name, client_phone, client_address,
    external_booking, canton_id, client_lat, client_lng, address_detail,
    final_price, created_at
  ) VALUES (
    p_provider_id, p_listing_id, NULL, p_start_time, p_end_time,
    'pending', 'none', coalesce(p_notes, ''), p_client_name, p_client_phone, p_client_address,
    true, p_canton_id, p_client_lat, p_client_lng, p_address_detail,
    p_final_price, NOW()
  ) RETURNING id INTO v_appointment_id;

  -- Reservar los slots necesarios
  FOR v_i IN 0..(v_required_slots - 1) LOOP
    v_current := p_start_time + (v_i * (v_slot_minutes || ' minutes')::interval);
    INSERT INTO provider_time_slots (
      provider_id, listing_id, slot_date, start_time, end_time,
      slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type, created_at
    ) VALUES (
      p_provider_id, p_listing_id, v_current::date,
      v_current::time, (v_current + (v_slot_minutes || ' minutes')::interval)::time,
      v_current, v_current + (v_slot_minutes || ' minutes')::interval,
      false, true, 'reserved', NOW()
    ) ON CONFLICT (provider_id, listing_id, slot_datetime_start)
      DO UPDATE SET is_available = false, is_reserved = true, slot_type = 'reserved';
  END LOOP;

  RETURN QUERY SELECT v_appointment_id, 'created'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_external_booking(
  uuid, uuid, timestamptz, timestamptz, text, text, text, text, integer,
  double precision, double precision, jsonb, numeric, integer
) TO anon, authenticated;
