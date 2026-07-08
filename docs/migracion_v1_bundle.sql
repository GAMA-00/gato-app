-- ============================================================
-- BUNDLE MIGRACIONES v1 (concepto nuevo) — aplicar en orden
-- Aditivas e idempotentes. Pegar en Supabase → SQL Editor.
-- ============================================================

-- ╔══ 20260616120000_geografia_cr_schema.sql ══╗
-- Geografía de Costa Rica (concepto v1) — esquema
-- Ver docs/CONCEPTO_V1.md §5.1 y docs/skills/SKILL_CANTONES_GEO.md
--
-- Modelo aditivo y NO destructivo: convive con residencias/condominios existentes.
-- Tablas: provincias (7), cantones (84), provider_cantones (zonas de trabajo).
-- Columna nueva: users.canton_base_id (cantón de residencia del proveedor).
--
-- Nota sobre centroides: centroid_lat/lng quedan NULLABLE en esta fase. Se cargan los
-- nombres/códigos oficiales ahora (selectores O-3/O-6/SE-3) y los centroides desde un
-- dataset oficial antes de F5 (recomendación por proximidad / distancias).

-- ============================================================
-- 1. PROVINCIAS (7)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.provincias (
  id      smallint PRIMARY KEY,        -- 1..7 (código oficial)
  nombre  text NOT NULL UNIQUE
);

ALTER TABLE public.provincias ENABLE ROW LEVEL SECURITY;

-- Catálogo estático: lectura pública, sin escritura desde el cliente
DROP POLICY IF EXISTS "Provincias lectura pública" ON public.provincias;
CREATE POLICY "Provincias lectura pública"
  ON public.provincias FOR SELECT
  USING (true);

-- ============================================================
-- 2. CANTONES (84)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cantones (
  id            integer PRIMARY KEY,    -- código oficial: provincia*100 + número
  provincia_id  smallint NOT NULL REFERENCES public.provincias(id),
  nombre        text NOT NULL,
  centroid_lat  double precision,       -- NULLABLE en esta fase (se llena antes de F5)
  centroid_lng  double precision,
  UNIQUE (provincia_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_cantones_provincia ON public.cantones(provincia_id);

ALTER TABLE public.cantones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cantones lectura pública" ON public.cantones;
CREATE POLICY "Cantones lectura pública"
  ON public.cantones FOR SELECT
  USING (true);

-- ============================================================
-- 3. USERS: cantón de residencia del proveedor (aditivo)
-- ============================================================
-- Centroide del cantón base se usa para distancias cuando no hay otras citas ese día.
-- NUNCA se guarda la dirección exacta del proveedor.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS canton_base_id integer REFERENCES public.cantones(id);

-- ============================================================
-- 4. PROVIDER_CANTONES: zonas de trabajo del proveedor (O-6, SE-3, M-1)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.provider_cantones (
  provider_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  canton_id         integer NOT NULL REFERENCES public.cantones(id),
  preferred_days    int[] NOT NULL DEFAULT '{}',     -- 0..6 (domingo..sábado)
  accepts_requests  boolean NOT NULL DEFAULT true,    -- toggle "aceptar solicitudes de este cantón"
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, canton_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_cantones_canton ON public.provider_cantones(canton_id);

ALTER TABLE public.provider_cantones ENABLE ROW LEVEL SECURITY;

-- Lectura pública: el booking link y el directorio muestran dónde trabaja el proveedor
DROP POLICY IF EXISTS "Zonas de trabajo lectura pública" ON public.provider_cantones;
CREATE POLICY "Zonas de trabajo lectura pública"
  ON public.provider_cantones FOR SELECT
  USING (true);

-- El proveedor administra sus propias zonas
DROP POLICY IF EXISTS "Proveedor administra sus zonas (insert)" ON public.provider_cantones;
CREATE POLICY "Proveedor administra sus zonas (insert)"
  ON public.provider_cantones FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Proveedor administra sus zonas (update)" ON public.provider_cantones;
CREATE POLICY "Proveedor administra sus zonas (update)"
  ON public.provider_cantones FOR UPDATE
  USING (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Proveedor administra sus zonas (delete)" ON public.provider_cantones;
CREATE POLICY "Proveedor administra sus zonas (delete)"
  ON public.provider_cantones FOR DELETE
  USING (auth.uid() = provider_id);

-- ╔══ 20260616120100_geografia_cr_seed.sql ══╗
-- Geografía de Costa Rica (concepto v1) — seed de datos oficiales
-- 7 provincias + 84 cantones (códigos oficiales: provincia*100 + número).
-- Idempotente (ON CONFLICT DO NOTHING). Centroides se cargan en un pase posterior.

-- ============================================================
-- PROVINCIAS
-- ============================================================
INSERT INTO public.provincias (id, nombre) VALUES
  (1, 'San José'),
  (2, 'Alajuela'),
  (3, 'Cartago'),
  (4, 'Heredia'),
  (5, 'Guanacaste'),
  (6, 'Puntarenas'),
  (7, 'Limón')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CANTONES (84)
-- ============================================================
INSERT INTO public.cantones (id, provincia_id, nombre) VALUES
  -- San José (20)
  (101, 1, 'San José'),
  (102, 1, 'Escazú'),
  (103, 1, 'Desamparados'),
  (104, 1, 'Puriscal'),
  (105, 1, 'Tarrazú'),
  (106, 1, 'Aserrí'),
  (107, 1, 'Mora'),
  (108, 1, 'Goicoechea'),
  (109, 1, 'Santa Ana'),
  (110, 1, 'Alajuelita'),
  (111, 1, 'Vázquez de Coronado'),
  (112, 1, 'Acosta'),
  (113, 1, 'Tibás'),
  (114, 1, 'Moravia'),
  (115, 1, 'Montes de Oca'),
  (116, 1, 'Turrubares'),
  (117, 1, 'Dota'),
  (118, 1, 'Curridabat'),
  (119, 1, 'Pérez Zeledón'),
  (120, 1, 'León Cortés Castro'),
  -- Alajuela (16)
  (201, 2, 'Alajuela'),
  (202, 2, 'San Ramón'),
  (203, 2, 'Grecia'),
  (204, 2, 'San Mateo'),
  (205, 2, 'Atenas'),
  (206, 2, 'Naranjo'),
  (207, 2, 'Palmares'),
  (208, 2, 'Poás'),
  (209, 2, 'Orotina'),
  (210, 2, 'San Carlos'),
  (211, 2, 'Zarcero'),
  (212, 2, 'Sarchí'),
  (213, 2, 'Upala'),
  (214, 2, 'Los Chiles'),
  (215, 2, 'Guatuso'),
  (216, 2, 'Río Cuarto'),
  -- Cartago (8)
  (301, 3, 'Cartago'),
  (302, 3, 'Paraíso'),
  (303, 3, 'La Unión'),
  (304, 3, 'Jiménez'),
  (305, 3, 'Turrialba'),
  (306, 3, 'Alvarado'),
  (307, 3, 'Oreamuno'),
  (308, 3, 'El Guarco'),
  -- Heredia (10)
  (401, 4, 'Heredia'),
  (402, 4, 'Barva'),
  (403, 4, 'Santo Domingo'),
  (404, 4, 'Santa Bárbara'),
  (405, 4, 'San Rafael'),
  (406, 4, 'San Isidro'),
  (407, 4, 'Belén'),
  (408, 4, 'Flores'),
  (409, 4, 'San Pablo'),
  (410, 4, 'Sarapiquí'),
  -- Guanacaste (11)
  (501, 5, 'Liberia'),
  (502, 5, 'Nicoya'),
  (503, 5, 'Santa Cruz'),
  (504, 5, 'Bagaces'),
  (505, 5, 'Carrillo'),
  (506, 5, 'Cañas'),
  (507, 5, 'Abangares'),
  (508, 5, 'Tilarán'),
  (509, 5, 'Nandayure'),
  (510, 5, 'La Cruz'),
  (511, 5, 'Hojancha'),
  -- Puntarenas (13)
  (601, 6, 'Puntarenas'),
  (602, 6, 'Esparza'),
  (603, 6, 'Buenos Aires'),
  (604, 6, 'Montes de Oro'),
  (605, 6, 'Osa'),
  (606, 6, 'Quepos'),
  (607, 6, 'Golfito'),
  (608, 6, 'Coto Brus'),
  (609, 6, 'Parrita'),
  (610, 6, 'Corredores'),
  (611, 6, 'Garabito'),
  (612, 6, 'Monteverde'),
  (613, 6, 'Puerto Jiménez'),
  -- Limón (6)
  (701, 7, 'Limón'),
  (702, 7, 'Pococí'),
  (703, 7, 'Siquirres'),
  (704, 7, 'Talamanca'),
  (705, 7, 'Matina'),
  (706, 7, 'Guácimo')
ON CONFLICT (id) DO NOTHING;

-- ╔══ 20260616140000_booking_link_slug_y_geo.sql ══╗
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

-- ╔══ 20260616150000_provider_settings_y_buffer.sql ══╗
-- Configuración del proveedor + buffer de traslado (concepto v1) — F4
-- provider_settings: buffer, descuento por proximidad y toggles de recordatorio.
-- Ver docs/CONCEPTO_V1.md §5.4 y §8.1

CREATE TABLE IF NOT EXISTS public.provider_settings (
  provider_id                uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  buffer_enabled             boolean NOT NULL DEFAULT true,
  buffer_minutes             integer NOT NULL DEFAULT 30,
  proximity_discount_enabled boolean NOT NULL DEFAULT false,
  proximity_discount_pct     integer NOT NULL DEFAULT 0,
  show_recommended_slots     boolean NOT NULL DEFAULT true,
  reminder_24h_enabled       boolean NOT NULL DEFAULT true,
  reminder_2h_enabled        boolean NOT NULL DEFAULT false,
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_settings ENABLE ROW LEVEL SECURITY;

-- El proveedor administra su propia configuración
DROP POLICY IF EXISTS "Proveedor lee su config" ON public.provider_settings;
CREATE POLICY "Proveedor lee su config"
  ON public.provider_settings FOR SELECT
  USING (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Proveedor crea su config" ON public.provider_settings;
CREATE POLICY "Proveedor crea su config"
  ON public.provider_settings FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Proveedor actualiza su config" ON public.provider_settings;
CREATE POLICY "Proveedor actualiza su config"
  ON public.provider_settings FOR UPDATE
  USING (auth.uid() = provider_id);

-- Trigger updated_at (función dedicada, patrón del proyecto)
CREATE OR REPLACE FUNCTION public.update_provider_settings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_provider_settings_updated_at ON public.provider_settings;
CREATE TRIGGER update_provider_settings_updated_at
  BEFORE UPDATE ON public.provider_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_settings_updated_at();

-- ============================================================
-- Buffer de traslado en la creación de reserva externa
-- ============================================================
-- Reescribe create_external_booking (definida en la migración de F3) para que, además
-- de reservar los slots de la cita, reserve el buffer de traslado posterior según la
-- config del proveedor (default: 30 min activado). Misma firma → no rompe llamadas.
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
  v_buffer_enabled boolean := true;
  v_buffer_minutes integer := 30;
  v_buffer_slots integer := 0;
  v_buffer_start timestamptz;
BEGIN
  IF p_provider_id IS NULL OR p_listing_id IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
    RAISE EXCEPTION 'Faltan parámetros requeridos';
  END IF;
  IF coalesce(p_client_name, '') = '' OR coalesce(p_client_phone, '') = '' THEN
    RAISE EXCEPTION 'Nombre y WhatsApp del cliente son requeridos';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_provider_id AND role = 'provider' AND is_active = true) THEN
    RAISE EXCEPTION 'Proveedor no válido';
  END IF;

  IF p_total_duration IS NOT NULL AND p_total_duration > v_slot_minutes THEN
    v_required_slots := CEIL(p_total_duration::numeric / v_slot_minutes);
  END IF;

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

  -- Reservar los slots de la cita
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

  -- Buffer de traslado posterior (según config del proveedor; default ON 30 min)
  SELECT ps.buffer_enabled, ps.buffer_minutes INTO v_buffer_enabled, v_buffer_minutes
  FROM provider_settings ps WHERE ps.provider_id = p_provider_id;
  v_buffer_enabled := COALESCE(v_buffer_enabled, true);
  v_buffer_minutes := COALESCE(v_buffer_minutes, 30);

  IF v_buffer_enabled AND v_buffer_minutes > 0 THEN
    v_buffer_slots := CEIL(v_buffer_minutes::numeric / v_slot_minutes);
    FOR v_i IN 0..(v_buffer_slots - 1) LOOP
      v_buffer_start := p_end_time + (v_i * (v_slot_minutes || ' minutes')::interval);
      INSERT INTO provider_time_slots (
        provider_id, listing_id, slot_date, start_time, end_time,
        slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type, created_at
      ) VALUES (
        p_provider_id, p_listing_id, v_buffer_start::date,
        v_buffer_start::time, (v_buffer_start + (v_slot_minutes || ' minutes')::interval)::time,
        v_buffer_start, v_buffer_start + (v_slot_minutes || ' minutes')::interval,
        false, true, 'buffer', NOW()
      ) ON CONFLICT (provider_id, listing_id, slot_datetime_start)
        DO NOTHING;  -- no pisar una cita real adyacente
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_appointment_id, 'created'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_external_booking(
  uuid, uuid, timestamptz, timestamptz, text, text, text, text, integer,
  double precision, double precision, jsonb, numeric, integer
) TO anon, authenticated;

-- ╔══ 20260616160000_proximity_recommendations.sql ══╗
-- Recomendación + descuento por proximidad (concepto v1) — F5, pilar #3
-- Cuando el cliente fija su cantón en el booking link, se le recomiendan los slots
-- contiguos (anterior/posterior+buffer) a citas del proveedor en ese mismo cantón ese
-- día. Ver docs/CONCEPTO_V1.md §8.2 y docs/skills/SKILL_PROXIMITY_SLOTS.md
--
-- Seguridad: estos RPC son SECURITY DEFINER y NO exponen datos de clientes; solo
-- devuelven horarios recomendados y la config de descuento del proveedor.

-- ============================================================
-- 1. Horarios recomendados para un cliente en cierto cantón
-- ============================================================
-- Devuelve los slot_datetime_start (de slots realmente disponibles del listing) que son
-- contiguos a una cita del proveedor en el MISMO cantón ese día:
--   - el slot que termina justo cuando empieza esa cita (anterior)
--   - el slot que empieza justo al terminar esa cita + buffer (posterior)
CREATE OR REPLACE FUNCTION public.get_recommended_slot_starts(
  p_provider_id uuid,
  p_listing_id uuid,
  p_canton_id integer
)
RETURNS TABLE (slot_start timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buffer integer;
BEGIN
  IF p_canton_id IS NULL THEN
    RETURN;  -- sin cantón no hay recomendaciones
  END IF;

  SELECT COALESCE(ps.buffer_minutes, 30) INTO v_buffer
  FROM provider_settings ps WHERE ps.provider_id = p_provider_id;
  v_buffer := COALESCE(v_buffer, 30);

  RETURN QUERY
  WITH same_canton AS (
    SELECT a.start_time, a.end_time
    FROM appointments a
    WHERE a.provider_id = p_provider_id
      AND a.canton_id = p_canton_id
      AND a.status IN ('pending', 'confirmed')
      AND a.start_time >= now()
  ),
  candidates AS (
    SELECT (start_time - interval '30 minutes') AS s FROM same_canton
    UNION
    SELECT (end_time + (v_buffer || ' minutes')::interval) AS s FROM same_canton
  )
  SELECT pts.slot_datetime_start
  FROM candidates c
  JOIN provider_time_slots pts
    ON pts.provider_id = p_provider_id
   AND pts.listing_id = p_listing_id
   AND pts.slot_datetime_start = c.s
   AND pts.is_available = true
   AND pts.is_reserved = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recommended_slot_starts(uuid, uuid, integer) TO anon, authenticated;

-- ============================================================
-- 2. Config pública de proximidad del proveedor (para el booking link)
-- ============================================================
-- Solo expone lo necesario para mostrar recomendaciones/descuento; nada sensible.
-- Devuelve siempre una fila (defaults si el proveedor no tiene config).
CREATE OR REPLACE FUNCTION public.get_provider_public_settings(p_provider_id uuid)
RETURNS TABLE (
  show_recommended_slots boolean,
  proximity_discount_enabled boolean,
  proximity_discount_pct integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(ps.show_recommended_slots, true),
    COALESCE(ps.proximity_discount_enabled, false),
    COALESCE(ps.proximity_discount_pct, 0)
  FROM (SELECT 1) x
  LEFT JOIN provider_settings ps ON ps.provider_id = p_provider_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_public_settings(uuid) TO anon, authenticated;

-- ╔══ 20260616170000_reminder_jobs.sql ══╗
-- Recordatorios automáticos (concepto v1) — F6, pilar #2
-- Cola de recordatorios + encolado automático al confirmar la cita, según los toggles
-- del proveedor (provider_settings). Los envía la edge function send-reminders (cron).
-- Ver docs/CONCEPTO_V1.md §5.6 y §9

CREATE TABLE IF NOT EXISTS public.reminder_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('24h', '2h', 'rebook_monthly')),
  send_at         timestamptz NOT NULL,
  sent_at         timestamptz,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  error_details   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Evita duplicar un mismo recordatorio para la misma cita
  UNIQUE (appointment_id, kind)
);

-- El cron busca los pendientes vencidos
CREATE INDEX IF NOT EXISTS idx_reminder_jobs_due
  ON public.reminder_jobs(send_at) WHERE status = 'pending';

ALTER TABLE public.reminder_jobs ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: solo las edge functions (service_role) operan la cola.

-- ============================================================
-- Encolar recordatorios al confirmar / completar la cita
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_appointment_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_24h boolean := true;
  v_2h boolean := false;
BEGIN
  -- Al pasar a 'confirmed': programar recordatorios 24h / 2h antes
  IF NEW.status = 'confirmed' AND COALESCE(OLD.status, '') <> 'confirmed' THEN
    SELECT COALESCE(ps.reminder_24h_enabled, true), COALESCE(ps.reminder_2h_enabled, false)
      INTO v_24h, v_2h
    FROM provider_settings ps WHERE ps.provider_id = NEW.provider_id;
    v_24h := COALESCE(v_24h, true);
    v_2h := COALESCE(v_2h, false);

    IF v_24h AND NEW.start_time - interval '24 hours' > now() THEN
      INSERT INTO reminder_jobs (appointment_id, kind, send_at)
      VALUES (NEW.id, '24h', NEW.start_time - interval '24 hours')
      ON CONFLICT (appointment_id, kind) DO NOTHING;
    END IF;

    IF v_2h AND NEW.start_time - interval '2 hours' > now() THEN
      INSERT INTO reminder_jobs (appointment_id, kind, send_at)
      VALUES (NEW.id, '2h', NEW.start_time - interval '2 hours')
      ON CONFLICT (appointment_id, kind) DO NOTHING;
    END IF;
  END IF;

  -- Al completarse: recordatorio para agendar el próximo mes (retención)
  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' THEN
    INSERT INTO reminder_jobs (appointment_id, kind, send_at)
    VALUES (NEW.id, 'rebook_monthly', NEW.end_time + interval '30 days')
    ON CONFLICT (appointment_id, kind) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_appointment_reminders ON public.appointments;
CREATE TRIGGER trg_enqueue_appointment_reminders
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_appointment_reminders();
