-- ============================================================
-- GATO: Reset de producción al esquema limpio v1
-- Ejecutar completo en Supabase Dashboard → SQL Editor
-- ADVERTENCIA: borra TODAS las tablas y datos del schema public
-- ============================================================

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- ===== BASELINE V1 =====
-- ============================================================
-- GATO v1 — ESQUEMA LIMPIO COMPLETO (aplicar en proyecto NUEVO)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- REBUILD LIMPIO v1 — ETAPA 1: TABLAS VITALES
-- ============================================================
-- Solo las tablas que el v1 usa. Quitadas (muertas): onvopay_*, payment_methods,
-- price_history, invoices, post_payment_*, residencias, condominiums,
-- provider_residencias, listing_residencias, clients, providers, team_members,
-- cancellation_policies, email_logs, recurring_instances (dup), provider_slot_preferences,
-- admin_stat_offsets, system_settings, onvopay_customers/webhooks/subscriptions.
-- Las columnas que apuntaban a esas tablas se eliminaron de users/appointments.

-- Enum de roles (para user_roles / has_role)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'provider', 'client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Catálogo de servicios ----------
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.service_categories(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Usuarios (perfil) ----------
-- Sin FK a residencias/condominios (tablas muertas). Se mantienen columnas de texto
-- por compatibilidad de UI, pero canton_base_id (v1) es la ubicación real.
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'client' CHECK (role = ANY (ARRAY['client','provider','admin'])),
  avatar_url text,
  about_me text,
  experience_years integer DEFAULT 0,
  average_rating numeric,
  certification_files jsonb,
  house_number text,
  address text,
  is_active boolean DEFAULT true,
  auth_provider text DEFAULT 'email',
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (user_id, role)
);

-- ---------- Catálogo del proveedor (listings) ----------
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL UNIQUE REFERENCES public.users(id),
  service_type_id uuid NOT NULL REFERENCES public.service_types(id),
  title text NOT NULL,
  description text NOT NULL,
  base_price numeric NOT NULL,
  duration integer NOT NULL,
  standard_duration integer NOT NULL,
  is_active boolean DEFAULT true,
  service_variants jsonb,
  gallery_images jsonb,
  custom_variable_groups jsonb,
  use_custom_variables boolean DEFAULT false,
  is_post_payment boolean NOT NULL DEFAULT false,
  availability jsonb,
  slot_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  slot_size integer NOT NULL DEFAULT 30 CHECK (slot_size = ANY (ARRAY[30, 60])),
  currency text NOT NULL DEFAULT 'CRC' CHECK (currency = ANY (ARRAY['USD','CRC'])),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Disponibilidad y slots ----------
CREATE TABLE public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.users(id),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, day_of_week, start_time, end_time)
);

CREATE TABLE public.recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  client_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  start_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  recurrence_type text NOT NULL CHECK (recurrence_type = ANY (ARRAY['weekly','biweekly','monthly'])),
  day_of_week integer,
  day_of_month integer,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  apartment text,
  client_address text,
  client_phone text,
  client_email text,
  client_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.provider_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.users(id),
  listing_id uuid NOT NULL REFERENCES public.listings(id),
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_datetime_start timestamptz NOT NULL,
  slot_datetime_end timestamptz NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  is_reserved boolean NOT NULL DEFAULT false,
  slot_type text DEFAULT 'generated',
  recurring_blocked boolean DEFAULT false,
  recurring_rule_id uuid REFERENCES public.recurring_rules(id),
  blocked_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, listing_id, slot_datetime_start)
);

CREATE TABLE public.blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.users(id),
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Citas ----------
-- Sin columnas de pago (onvopay_*) ni residencia_id con FK. recurrence se conserva.
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id),
  client_id uuid REFERENCES public.users(id),
  provider_id uuid NOT NULL REFERENCES public.users(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending','confirmed','completed','cancelled','rejected','rescheduled'])),
  recurrence text DEFAULT 'none' CHECK (recurrence IS NULL OR (recurrence = ANY (ARRAY['none','once','daily','weekly','biweekly','triweekly','monthly']))),
  notes text,
  admin_notes text,
  cancellation_time timestamptz,
  cancellation_reason text,
  last_modified_by uuid,
  last_modified_at timestamptz,
  client_name text,
  provider_name text,
  client_email text,
  client_phone text,
  client_address text,
  external_booking boolean DEFAULT false,
  recurrence_group_id uuid,
  recurring_rule_id uuid REFERENCES public.recurring_rules(id),
  is_recurring_instance boolean DEFAULT false,
  final_price numeric,
  custom_variable_selections jsonb,
  custom_variables_total_price numeric DEFAULT 0,
  price_finalized boolean DEFAULT false,
  created_from text DEFAULT 'client_app',
  created_by_user uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recurring_appointment_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_rule_id uuid NOT NULL REFERENCES public.recurring_rules(id),
  instance_date date NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurring_rule_id, instance_date)
);

CREATE TABLE public.recurring_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id),
  exception_date date NOT NULL,
  action_type text NOT NULL CHECK (action_type = ANY (ARRAY['cancelled','rescheduled'])),
  new_start_time timestamptz,
  new_end_time timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Reseñas ----------
CREATE TABLE public.provider_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  client_id uuid NOT NULL,
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- ============================================================
-- REBUILD LIMPIO v1 — ETAPA 2: FUNCIONES VITALES
-- ============================================================
-- Solo las funciones que el v1 necesita. Quitadas todas las de pagos/onvopay/
-- facturas/email. handle_new_user reescrito (sin clients/providers/residencias).
-- generate_provider_time_slots_for_listing con timezone corregido a Costa Rica.

-- ---------- Genéricos ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- Roles / auth ----------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'provider' THEN 2 WHEN 'client' THEN 3 END
  LIMIT 1;
$$;

-- handle_new_user REESCRITO: crea solo public.users (sin clients/providers/residencias)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  user_role TEXT;
  user_auth_provider TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  user_auth_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  INSERT INTO public.users (id, name, email, role, phone, avatar_url, auth_provider, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.email,
    user_role,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    user_auth_provider,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.users.name),
    email = COALESCE(EXCLUDED.email, public.users.email),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    auth_provider = EXCLUDED.auth_provider;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.role != NEW.role AND auth.uid() = NEW.id THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.toggle_user_active(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admins pueden cambiar estado de usuarios';
  END IF;
  UPDATE public.users SET is_active = NOT is_active WHERE id = _user_id;
END; $$;

-- ---------- Citas: nombres, slots, validaciones ----------
CREATE OR REPLACE FUNCTION public.set_appointment_names()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  -- No pisar el nombre del cliente invitado (booking link, client_id NULL)
  IF NEW.client_id IS NOT NULL THEN
    SELECT name INTO NEW.client_name FROM users WHERE id = NEW.client_id;
  END IF;
  SELECT name INTO NEW.provider_name FROM users WHERE id = NEW.provider_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_slot_as_reserved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE provider_time_slots SET is_reserved = true, is_available = false
  WHERE provider_id = NEW.provider_id AND listing_id = NEW.listing_id
    AND slot_datetime_start >= NEW.start_time AND slot_datetime_start < NEW.end_time;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.release_slot_on_cancellation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('cancelled','rejected') AND OLD.status NOT IN ('cancelled','rejected') THEN
    UPDATE provider_time_slots SET is_reserved = false, is_available = true
    WHERE provider_id = NEW.provider_id AND listing_id = NEW.listing_id
      AND slot_datetime_start >= NEW.start_time AND slot_datetime_start < NEW.end_time
      AND slot_type IN ('reserved','generated');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_appointment_completion()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.end_time > NOW() THEN
    RAISE EXCEPTION 'Cannot mark future appointments as completed. Ends at: %, Now: %', NEW.end_time, NOW();
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_slot_insertion()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM provider_time_slots
             WHERE provider_id = NEW.provider_id AND listing_id = NEW.listing_id
               AND slot_datetime_start = NEW.slot_datetime_start AND id != NEW.id) THEN
    RAISE EXCEPTION 'Duplicate slot detected';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_past_appointments_completed()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE updated_count INTEGER := 0;
BEGIN
  UPDATE appointments SET status = 'completed'
  WHERE status = 'confirmed' AND end_time < (NOW() - INTERVAL '1 hour');
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END; $$;

CREATE OR REPLACE FUNCTION public.toggle_slot_availability(p_slot_id uuid, p_is_available boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE provider_time_slots SET is_available = p_is_available, is_reserved = NOT p_is_available,
    slot_type = CASE WHEN p_is_available = false THEN 'manually_blocked' ELSE 'generated' END
  WHERE id = p_slot_id;
  RETURN FOUND;
END; $$;

-- ---------- Generación de slots (timezone CR) ----------
CREATE OR REPLACE FUNCTION public.generate_provider_time_slots_for_listing(p_provider_id uuid, p_listing_id uuid, p_days_ahead integer DEFAULT 60)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_timezone text := 'America/Costa_Rica';  -- FIX: era America/Mexico_City
  v_slot_size integer := 30;
  v_provider_avail RECORD;
  v_current_date date;
  v_end_date date;
  v_day_of_week integer;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_window_end_tz timestamptz;
  v_slots_created integer := 0;
  v_window_start time;
  v_window_end time;
  v_local_start_time time;
  v_local_end_time time;
BEGIN
  v_current_date := CURRENT_DATE;
  v_end_date := v_current_date + p_days_ahead;
  WHILE v_current_date <= v_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::integer;
    FOR v_provider_avail IN
      SELECT start_time, end_time FROM provider_availability
      WHERE provider_id = p_provider_id AND day_of_week = v_day_of_week AND is_active = true
    LOOP
      v_window_start := v_provider_avail.start_time;
      v_window_end := v_provider_avail.end_time;
      v_slot_start := (v_current_date + v_window_start) AT TIME ZONE v_timezone;
      v_window_end_tz := (v_current_date + v_window_end) AT TIME ZONE v_timezone;
      WHILE (v_slot_start + (v_slot_size || ' minutes')::interval) <= v_window_end_tz LOOP
        v_slot_end := v_slot_start + (v_slot_size || ' minutes')::interval;
        IF v_slot_start > NOW() THEN
          v_local_start_time := (v_slot_start AT TIME ZONE v_timezone)::time;
          v_local_end_time := (v_slot_end AT TIME ZONE v_timezone)::time;
          INSERT INTO provider_time_slots (provider_id, listing_id, slot_date, start_time, end_time,
            slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type)
          VALUES (p_provider_id, p_listing_id, v_current_date, v_local_start_time, v_local_end_time,
            v_slot_start, v_slot_end, true, false, 'generated')
          ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
          v_slots_created := v_slots_created + 1;
        END IF;
        v_slot_start := v_slot_end;
      END LOOP;
    END LOOP;
    v_current_date := v_current_date + 1;
  END LOOP;
  RETURN v_slots_created;
END; $$;

CREATE OR REPLACE FUNCTION public.auto_generate_slots_for_new_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM generate_provider_time_slots_for_listing(NEW.provider_id, NEW.id);
  RETURN NEW;
END; $$;

-- NO-OP: slots no se regeneran automáticamente
CREATE OR REPLACE FUNCTION public.regenerate_slots_for_listing(p_listing_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN RETURN 0; END; $$;

CREATE OR REPLACE FUNCTION public.maintain_future_slots()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_listing RECORD;
BEGIN
  FOR v_listing IN SELECT l.id AS listing_id, l.provider_id FROM listings l WHERE l.is_active = true LOOP
    PERFORM generate_provider_time_slots_for_listing(v_listing.provider_id, v_listing.listing_id, 60);
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_provider_availability_from_listing(p_listing_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_provider_id uuid; v_availability jsonb; v_inserted integer := 0;
BEGIN
  SELECT provider_id, availability::jsonb INTO v_provider_id, v_availability FROM listings WHERE id = p_listing_id;
  IF v_provider_id IS NULL THEN RAISE EXCEPTION 'Listing % no existe', p_listing_id; END IF;
  IF v_availability IS NULL OR v_availability = '{}'::jsonb THEN
    DELETE FROM provider_availability WHERE provider_id = v_provider_id; RETURN 0;
  END IF;
  DELETE FROM provider_availability WHERE provider_id = v_provider_id;
  WITH days(day_name, day_of_week) AS (VALUES ('sunday',0),('monday',1),('tuesday',2),('wednesday',3),('thursday',4),('friday',5),('saturday',6)),
  enabled_days AS (
    SELECT d.day_of_week,
      COALESCE((v_availability->d.day_name->>'enabled')::boolean, false) AS enabled,
      COALESCE((v_availability->d.day_name->'timeSlots')::jsonb, '[]'::jsonb) AS slots
    FROM days d)
  INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_active)
  SELECT v_provider_id, ed.day_of_week, (slot->>'startTime')::time, (slot->>'endTime')::time, true
  FROM enabled_days ed CROSS JOIN LATERAL jsonb_array_elements(ed.slots) AS slot
  WHERE ed.enabled = true;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END; $$;

CREATE OR REPLACE FUNCTION public.on_listings_update_sync_and_regen()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_synced integer;
BEGIN
  IF (OLD.availability IS DISTINCT FROM NEW.availability)
     OR (OLD.standard_duration IS DISTINCT FROM NEW.standard_duration)
     OR (OLD.duration IS DISTINCT FROM NEW.duration) THEN
    BEGIN SELECT sync_provider_availability_from_listing(NEW.id) INTO v_synced;
    EXCEPTION WHEN OTHERS THEN RAISE LOG 'sync error listing %: %', NEW.id, SQLERRM; END;
  END IF;
  RETURN NEW;
END; $$;

-- ---------- Recurrencia ----------
CREATE OR REPLACE FUNCTION public.calculate_next_occurrence_sql(original_date date, recurrence_type text, reference_date date)
RETURNS date LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE target_dow INTEGER; next_date DATE; days_until_target INTEGER; weeks_diff INTEGER;
BEGIN
  target_dow := EXTRACT(DOW FROM original_date)::INTEGER;
  CASE recurrence_type
    WHEN 'weekly' THEN
      days_until_target := (target_dow - EXTRACT(DOW FROM reference_date)::INTEGER + 7) % 7;
      IF days_until_target = 0 THEN days_until_target := 7; END IF;
      RETURN reference_date + days_until_target;
    WHEN 'biweekly' THEN
      days_until_target := (target_dow - EXTRACT(DOW FROM reference_date)::INTEGER + 7) % 7;
      IF days_until_target = 0 THEN days_until_target := 7; END IF;
      next_date := reference_date + days_until_target;
      weeks_diff := ((next_date - original_date) / 7)::INTEGER;
      IF weeks_diff % 2 != 0 THEN next_date := next_date + 7; END IF;
      RETURN next_date;
    WHEN 'monthly' THEN
      next_date := (DATE_TRUNC('month', reference_date) + INTERVAL '1 month' + (EXTRACT(DAY FROM original_date) - 1) * INTERVAL '1 day')::DATE;
      IF EXTRACT(DAY FROM reference_date) < EXTRACT(DAY FROM original_date) THEN
        next_date := (DATE_TRUNC('month', reference_date) + (EXTRACT(DAY FROM original_date) - 1) * INTERVAL '1 day')::DATE;
      END IF;
      RETURN next_date;
    ELSE RETURN reference_date;
  END CASE;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_recurring_appointment_instances(p_rule_id uuid, p_weeks_ahead integer DEFAULT 10)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  rule_record recurring_rules%ROWTYPE; start_date_calc DATE; end_date_calc DATE;
  next_occurrence DATE; instance_count INTEGER := 0; start_datetime timestamptz; end_datetime timestamptz; instances_created INTEGER := 0;
BEGIN
  SELECT * INTO rule_record FROM recurring_rules WHERE id = p_rule_id AND is_active = true;
  IF NOT FOUND THEN RETURN 0; END IF;
  start_date_calc := GREATEST(rule_record.start_date, CURRENT_DATE);
  end_date_calc := start_date_calc + (p_weeks_ahead * 7);
  next_occurrence := start_date_calc;
  WHILE next_occurrence <= end_date_calc AND instances_created < 50 LOOP
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN
        WHILE EXTRACT(DOW FROM next_occurrence)::INTEGER != rule_record.day_of_week LOOP next_occurrence := next_occurrence + 1; END LOOP;
      WHEN 'biweekly' THEN
        WHILE EXTRACT(DOW FROM next_occurrence)::INTEGER != rule_record.day_of_week
          OR EXTRACT(DAYS FROM next_occurrence - rule_record.start_date)::INTEGER % 14 != 0 LOOP
          next_occurrence := next_occurrence + 1; IF next_occurrence > end_date_calc THEN EXIT; END IF;
        END LOOP;
      WHEN 'monthly' THEN
        WHILE EXTRACT(DAY FROM next_occurrence)::INTEGER != rule_record.day_of_month LOOP
          next_occurrence := next_occurrence + 1; IF next_occurrence > end_date_calc THEN EXIT; END IF;
        END LOOP;
    END CASE;
    IF next_occurrence > end_date_calc THEN EXIT; END IF;
    start_datetime := (next_occurrence + rule_record.start_time) AT TIME ZONE 'America/Costa_Rica';
    end_datetime := (next_occurrence + rule_record.end_time) AT TIME ZONE 'America/Costa_Rica';
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE provider_id = rule_record.provider_id
        AND start_time < end_datetime AND end_time > start_datetime AND status NOT IN ('cancelled','rejected')) THEN
      INSERT INTO recurring_appointment_instances (recurring_rule_id, instance_date, start_time, end_time, status, notes)
      VALUES (p_rule_id, next_occurrence, start_datetime, end_datetime, 'scheduled', rule_record.notes)
      ON CONFLICT (recurring_rule_id, instance_date) DO NOTHING;
      GET DIAGNOSTICS instance_count = ROW_COUNT;
      IF instance_count > 0 THEN instances_created := instances_created + 1; END IF;
    END IF;
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN next_occurrence := next_occurrence + 7;
      WHEN 'biweekly' THEN next_occurrence := next_occurrence + 14;
      WHEN 'monthly' THEN next_occurrence := next_occurrence + 30;
    END CASE;
  END LOOP;
  RETURN instances_created;
END; $$;

CREATE OR REPLACE FUNCTION public.auto_generate_recurring_instances()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_active = true AND NEW.recurrence_type IN ('weekly','biweekly','monthly') THEN
    PERFORM generate_recurring_appointment_instances(NEW.id, 12);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.block_recurring_slots_for_appointment(p_appointment_id uuid, p_months_ahead integer DEFAULT 12)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE appt appointments%ROWTYPE; slots_blocked INTEGER := 0; iter_date DATE; end_date DATE;
  service_duration INTEGER; recurrence_interval INTEGER; slot_start timestamptz; slot_end timestamptz;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id AND recurrence IS NOT NULL AND recurrence != 'none';
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT standard_duration INTO service_duration FROM listings WHERE id = appt.listing_id;
  IF service_duration IS NULL THEN RETURN 0; END IF;
  iter_date := calculate_next_occurrence_sql(appt.start_time::date, appt.recurrence, CURRENT_DATE);
  end_date := CURRENT_DATE + (p_months_ahead * 30);
  recurrence_interval := CASE appt.recurrence WHEN 'weekly' THEN 7 WHEN 'biweekly' THEN 14 WHEN 'triweekly' THEN 21 WHEN 'monthly' THEN 30 ELSE 7 END;
  WHILE iter_date <= end_date AND slots_blocked < 365 LOOP
    slot_start := iter_date + appt.start_time::time;
    slot_end := slot_start + (service_duration || ' minutes')::interval;
    INSERT INTO provider_time_slots (provider_id, listing_id, slot_date, start_time, end_time,
      slot_datetime_start, slot_datetime_end, is_available, is_reserved, recurring_blocked, blocked_until)
    VALUES (appt.provider_id, appt.listing_id, iter_date, appt.start_time::time, slot_end::time,
      slot_start, slot_end, false, true, true, end_date)
    ON CONFLICT (provider_id, listing_id, slot_datetime_start)
    DO UPDATE SET is_available=false, is_reserved=true, recurring_blocked=true, blocked_until=end_date;
    slots_blocked := slots_blocked + 1;
    iter_date := iter_date + recurrence_interval;
  END LOOP;
  RETURN slots_blocked;
END; $$;

CREATE OR REPLACE FUNCTION public.unblock_recurring_slots_for_appointment(p_appointment_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE appt appointments%ROWTYPE; slots_unblocked INTEGER;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  UPDATE provider_time_slots SET is_available=true, is_reserved=false, recurring_blocked=false, blocked_until=NULL
  WHERE provider_id = appt.provider_id AND listing_id = appt.listing_id
    AND recurring_blocked = true AND start_time = appt.start_time::time AND slot_date > appt.start_time::date;
  GET DIAGNOSTICS slots_unblocked = ROW_COUNT;
  RETURN slots_unblocked;
END; $$;

CREATE OR REPLACE FUNCTION public.manage_recurring_appointment_slots()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE slots_affected integer := 0;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none' THEN
    BEGIN SELECT block_recurring_slots_for_appointment(NEW.id, 12) INTO slots_affected;
    EXCEPTION WHEN OTHERS THEN RAISE LOG 'block error %: %', NEW.id, SQLERRM; END;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('cancelled','rejected') AND OLD.status NOT IN ('cancelled','rejected')
       AND OLD.recurrence IS NOT NULL AND OLD.recurrence != 'none' THEN
      BEGIN SELECT unblock_recurring_slots_for_appointment(NEW.id) INTO slots_affected;
      EXCEPTION WHEN OTHERS THEN RAISE LOG 'unblock error %: %', NEW.id, SQLERRM; END;
    END IF;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.create_recurring_rule_from_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE day_of_week_val INTEGER; day_of_month_val INTEGER; rule_id UUID; real_client_name TEXT;
  existing_rule_id UUID; local_start_time TIME; local_end_time TIME; local_date DATE;
BEGIN
  IF NEW.recurrence IN ('weekly','biweekly','monthly') AND NEW.status = 'confirmed'
     AND (NEW.is_recurring_instance = false OR NEW.is_recurring_instance IS NULL) AND NEW.recurring_rule_id IS NULL THEN
    local_start_time := (NEW.start_time AT TIME ZONE 'America/Costa_Rica')::TIME;
    local_end_time := (NEW.end_time AT TIME ZONE 'America/Costa_Rica')::TIME;
    local_date := (NEW.start_time AT TIME ZONE 'America/Costa_Rica')::DATE;
    SELECT name INTO real_client_name FROM users WHERE id = NEW.client_id;
    SELECT id INTO existing_rule_id FROM recurring_rules
      WHERE client_id = NEW.client_id AND provider_id = NEW.provider_id AND listing_id = NEW.listing_id
        AND recurrence_type = NEW.recurrence AND start_time = local_start_time AND end_time = local_end_time
        AND is_active = true AND start_date <= local_date;
    IF existing_rule_id IS NULL THEN
      day_of_week_val := EXTRACT(DOW FROM local_date)::INTEGER;
      day_of_month_val := EXTRACT(DAY FROM local_date)::INTEGER;
      INSERT INTO recurring_rules (client_id, provider_id, listing_id, recurrence_type, start_date, start_time, end_time,
        day_of_week, day_of_month, is_active, client_name, notes, client_address, client_phone, client_email)
      VALUES (NEW.client_id, NEW.provider_id, NEW.listing_id, NEW.recurrence, local_date, local_start_time, local_end_time,
        CASE WHEN NEW.recurrence IN ('weekly','biweekly') THEN day_of_week_val ELSE NULL END,
        CASE WHEN NEW.recurrence = 'monthly' THEN day_of_month_val ELSE NULL END,
        true, COALESCE(real_client_name, NEW.client_name), NEW.notes, NEW.client_address, NEW.client_phone, NEW.client_email)
      RETURNING id INTO rule_id;
      UPDATE appointments SET recurring_rule_id = rule_id WHERE id = NEW.id;
    ELSE
      UPDATE appointments SET recurring_rule_id = existing_rule_id WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'create_recurring_rule error: %', SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.advance_recurring_appointment(p_appointment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id UUID; appt appointments%ROWTYPE; interval_rec INTERVAL; next_start timestamptz; next_end timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  IF v_user_id != appt.client_id AND v_user_id != appt.provider_id THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF appt.recurrence IS NULL OR appt.recurrence IN ('none','once','') THEN RAISE EXCEPTION 'Invalid recurrence'; END IF;
  CASE appt.recurrence
    WHEN 'daily' THEN interval_rec := INTERVAL '1 day';
    WHEN 'weekly' THEN interval_rec := INTERVAL '1 week';
    WHEN 'biweekly' THEN interval_rec := INTERVAL '2 weeks';
    WHEN 'triweekly' THEN interval_rec := INTERVAL '3 weeks';
    WHEN 'monthly' THEN interval_rec := INTERVAL '1 month';
    ELSE RAISE EXCEPTION 'Invalid recurrence'; END CASE;
  next_start := appt.start_time + interval_rec; next_end := appt.end_time + interval_rec;
  WHILE next_start <= now() LOOP next_start := next_start + interval_rec; next_end := next_end + interval_rec; END LOOP;
  INSERT INTO appointments (listing_id, client_id, provider_id, start_time, end_time, status, notes,
    client_address, client_phone, client_email, client_name, provider_name, recurrence, recurrence_group_id,
    external_booking, is_recurring_instance, created_at, created_from, created_by_user)
  VALUES (appt.listing_id, appt.client_id, appt.provider_id, next_start, next_end, 'confirmed', appt.notes,
    appt.client_address, appt.client_phone, appt.client_email, appt.client_name, appt.provider_name, appt.recurrence,
    appt.recurrence_group_id, appt.external_booking, true, now(), 'auto_advanced', appt.client_id);
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_appointment_atomic(p_appointment_id uuid, p_cancel_future boolean DEFAULT false, p_reason text DEFAULT 'user_cancelled', p_cancelled_by uuid DEFAULT NULL)
RETURNS TABLE(affected_count integer, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_appointment appointments%ROWTYPE; v_affected_count INTEGER := 0; v_instance_count INTEGER := 0;
BEGIN
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found: %', p_appointment_id; END IF;
  IF p_cancelled_by IS NOT NULL AND p_cancelled_by != v_appointment.client_id AND p_cancelled_by != v_appointment.provider_id THEN
    RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE appointments SET status='cancelled', cancellation_reason=p_reason, cancellation_time=NOW(),
    last_modified_at=NOW(), last_modified_by=COALESCE(p_cancelled_by, auth.uid()) WHERE id = p_appointment_id;
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  IF p_cancel_future AND v_appointment.recurrence IS NOT NULL AND v_appointment.recurrence != 'none' THEN
    UPDATE recurring_appointment_instances SET status='cancelled', notes=COALESCE(notes || ' ','') || '[CANCELLED WITH PARENT]'
    WHERE recurring_rule_id IN (SELECT id FROM recurring_rules WHERE provider_id=v_appointment.provider_id
        AND client_id=v_appointment.client_id AND listing_id=v_appointment.listing_id)
      AND instance_date > CURRENT_DATE AND status NOT IN ('cancelled','completed');
    GET DIAGNOSTICS v_instance_count = ROW_COUNT;
    v_affected_count := v_affected_count + v_instance_count;
    PERFORM unblock_recurring_slots_for_appointment(p_appointment_id);
  END IF;
  UPDATE provider_time_slots SET is_available=true, is_reserved=false, recurring_blocked=false
  WHERE provider_id=v_appointment.provider_id AND listing_id=v_appointment.listing_id
    AND slot_datetime_start >= v_appointment.start_time
    AND (slot_datetime_start = v_appointment.start_time OR (p_cancel_future AND recurring_blocked = true));
  RETURN QUERY SELECT v_affected_count, format('Cancelled %s appointment(s)', v_affected_count);
END; $$;

-- ---------- Ratings ----------
CREATE OR REPLACE FUNCTION public.submit_provider_rating(p_provider_id uuid, p_client_id uuid, p_appointment_id uuid, p_rating integer, p_comment text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO provider_ratings (provider_id, client_id, appointment_id, rating, comment, created_at)
  VALUES (p_provider_id, p_client_id, p_appointment_id, p_rating, p_comment, NOW())
  ON CONFLICT (appointment_id) DO UPDATE SET rating=p_rating, comment=p_comment, created_at=NOW();
  WITH provider_avg AS (SELECT (5.0 + SUM(rating::numeric)) / (COUNT(*) + 1) AS avg_rating FROM provider_ratings WHERE provider_id=p_provider_id)
  UPDATE users SET average_rating = ROUND(provider_avg.avg_rating, 1) FROM provider_avg WHERE users.id = p_provider_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_recurring_clients_count(provider_id uuid)
RETURNS integer LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RETURN (SELECT COUNT(DISTINCT appointments.client_id) FROM appointments
    WHERE appointments.provider_id = $1 AND appointments.client_id IS NOT NULL
      AND appointments.recurrence IN ('weekly','biweekly','monthly') AND appointments.status IN ('confirmed','completed'));
END; $$;

CREATE OR REPLACE FUNCTION public.get_provider_achievements_data(p_provider_id uuid)
RETURNS TABLE(completed_jobs_count integer, recurring_clients_count integer, average_rating numeric, total_ratings integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM mark_past_appointments_completed();
  RETURN QUERY
  WITH appointment_stats AS (
    SELECT COUNT(*) FILTER (WHERE a.status='completed') AS completed_count,
      COUNT(DISTINCT a.client_id) FILTER (WHERE a.recurrence IN ('weekly','biweekly','monthly') AND a.status IN ('confirmed','completed')) AS recurring_count
    FROM appointments a WHERE a.provider_id = p_provider_id),
  rating_stats AS (
    SELECT AVG(pr.rating)::numeric AS avg_rating, COUNT(pr.rating) AS rating_count
    FROM provider_ratings pr JOIN appointments a ON pr.appointment_id = a.id
    WHERE pr.provider_id = p_provider_id AND a.status='completed')
  SELECT COALESCE(appointment_stats.completed_count::integer,0), COALESCE(appointment_stats.recurring_count::integer,0),
    COALESCE(rating_stats.avg_rating, 5.0), COALESCE(rating_stats.rating_count::integer,0)
  FROM appointment_stats CROSS JOIN rating_stats;
END; $$;

-- ---------- Helpers de lectura (SQL) ----------
CREATE OR REPLACE FUNCTION public.get_provider_by_name(p_name text)
RETURNS TABLE(id uuid, name text, email text, phone text, avatar_url text, about_me text, average_rating numeric, experience_years integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.about_me, u.average_rating, u.experience_years
  FROM public.users u WHERE u.role='provider' AND lower(trim(u.name)) = lower(trim(p_name)) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_provider_day_busy(p_provider_id uuid, p_date date)
RETURNS TABLE(start_time timestamptz, end_time timestamptz, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a.start_time, a.end_time, 'appointment'::text FROM public.appointments a
  WHERE a.provider_id = p_provider_id AND a.status <> 'cancelled' AND a.start_time::date = p_date
  UNION ALL
  SELECT (b.slot_date + b.slot_time)::timestamptz, (b.slot_date + b.slot_time + interval '30 minutes')::timestamptz, 'blocked'::text
  FROM public.blocked_slots b WHERE b.provider_id = p_provider_id AND b.slot_date = p_date;
$$;

CREATE OR REPLACE FUNCTION public.get_provider_listing(p_provider_id uuid)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE listing_id UUID;
BEGIN SELECT id INTO listing_id FROM listings WHERE provider_id = p_provider_id AND is_active = true LIMIT 1; RETURN listing_id; END; $$;

CREATE OR REPLACE FUNCTION public.needs_price_finalization(appointment_row appointments)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT appointment_row.status='completed' AND (appointment_row.final_price IS NULL OR appointment_row.price_finalized = FALSE)
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = appointment_row.listing_id
      AND (listings.is_post_payment = TRUE OR listings.service_variants::text LIKE '%"ambas"%'));
$$;

CREATE OR REPLACE FUNCTION public.update_recurring_exceptions_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
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
-- ============================================================
-- REBUILD LIMPIO v1 — ETAPA 4: TRIGGERS
-- ============================================================
-- Solo triggers cuyas funciones y tablas conservamos. Quitados: facturas, onvopay,
-- email, prevent_role_updates (bloqueaba todo update de rol), duplicados.

-- Crear public.users al registrarse en auth (en Supabase auth.users existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Appointments
CREATE TRIGGER set_appointment_names_trigger
  BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION set_appointment_names();

CREATE TRIGGER trigger_mark_slot_reserved
  AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION mark_slot_as_reserved();

CREATE TRIGGER trigger_release_slot_on_cancellation
  AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION release_slot_on_cancellation();

CREATE TRIGGER trg_manage_recurring_appointment_slots_ins
  AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION manage_recurring_appointment_slots();

CREATE TRIGGER trg_manage_recurring_appointment_slots_upd
  AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION manage_recurring_appointment_slots();

CREATE TRIGGER trigger_create_recurring_rule
  AFTER UPDATE ON public.appointments FOR EACH ROW
  WHEN (new.status = 'confirmed'::text AND old.status = 'pending'::text)
  EXECUTE FUNCTION create_recurring_rule_from_appointment();

CREATE TRIGGER validate_appointment_status
  BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION validate_appointment_completion();

-- Users
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- Listings
CREATE TRIGGER trigger_auto_generate_slots
  AFTER INSERT ON public.listings FOR EACH ROW EXECUTE FUNCTION auto_generate_slots_for_new_listing();

CREATE TRIGGER trigger_listings_sync_availability
  AFTER UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION on_listings_update_sync_and_regen();

-- Recurring rules
CREATE TRIGGER trigger_auto_generate_recurring_instances
  AFTER INSERT OR UPDATE ON public.recurring_rules FOR EACH ROW EXECUTE FUNCTION auto_generate_recurring_instances();

-- Slots: NO se agrega validate_slot_insertion como trigger — la UNIQUE constraint
-- (provider_id, listing_id, slot_datetime_start) ya evita duplicados, y el trigger
-- rompía los upserts legítimos (INSERT ... ON CONFLICT) al reservar slots.

-- Recurring exceptions
CREATE TRIGGER update_recurring_exceptions_updated_at
  BEFORE UPDATE ON public.recurring_exceptions FOR EACH ROW EXECUTE FUNCTION update_recurring_exceptions_updated_at();

-- updated_at genéricos en tablas con esa columna
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_availability_updated_at
  BEFORE UPDATE ON public.provider_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurring_rules_updated_at
  BEFORE UPDATE ON public.recurring_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================
-- REBUILD LIMPIO v1 — ETAPA 5: RLS (nueva, simple)
-- ============================================================
-- Lectura pública donde el booking link/directorio la necesita; escritura del dueño.
-- Las RPC SECURITY DEFINER (crear cita, etc.) operan por encima de RLS.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_appointment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_ratings ENABLE ROW LEVEL SECURITY;

-- Catálogos: lectura pública
CREATE POLICY "cat lectura" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "tipos lectura" ON public.service_types FOR SELECT USING (true);

-- Users: lectura pública (directorio/booking muestran nombre/foto); update propio
CREATE POLICY "users lectura" ON public.users FOR SELECT USING (true);
CREATE POLICY "users update propio" ON public.users FOR UPDATE USING (auth.uid() = id);

-- user_roles: el dueño lee; admin gestiona
CREATE POLICY "roles lee propio" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "roles admin gestiona" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Listings: lectura pública; el proveedor gestiona el suyo
CREATE POLICY "listings lectura" ON public.listings FOR SELECT USING (true);
CREATE POLICY "listings dueño insert" ON public.listings FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "listings dueño update" ON public.listings FOR UPDATE USING (auth.uid() = provider_id);
CREATE POLICY "listings dueño delete" ON public.listings FOR DELETE USING (auth.uid() = provider_id);

-- Disponibilidad y slots: lectura pública (para agendar); proveedor gestiona
CREATE POLICY "avail lectura" ON public.provider_availability FOR SELECT USING (true);
CREATE POLICY "avail dueño" ON public.provider_availability FOR ALL USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "slots lectura" ON public.provider_time_slots FOR SELECT USING (true);
CREATE POLICY "slots dueño" ON public.provider_time_slots FOR ALL USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "blocked dueño" ON public.blocked_slots FOR ALL USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

-- Citas: cliente y proveedor ven/gestionan las suyas
CREATE POLICY "citas ver propias" ON public.appointments FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id OR public.is_admin(auth.uid()));
CREATE POLICY "citas cliente crea" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = provider_id);
CREATE POLICY "citas update partes" ON public.appointments FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = provider_id OR public.is_admin(auth.uid()));

-- Recurrencia: partes involucradas
CREATE POLICY "rrules partes" ON public.recurring_rules FOR ALL
  USING (auth.uid() = client_id OR auth.uid() = provider_id) WITH CHECK (auth.uid() = client_id OR auth.uid() = provider_id);
CREATE POLICY "rinst lectura" ON public.recurring_appointment_instances FOR SELECT
  USING (EXISTS (SELECT 1 FROM recurring_rules rr WHERE rr.id = recurring_rule_id AND (rr.client_id = auth.uid() OR rr.provider_id = auth.uid())));
CREATE POLICY "rexc partes" ON public.recurring_exceptions FOR ALL
  USING (EXISTS (SELECT 1 FROM appointments a WHERE a.id = appointment_id AND (a.client_id = auth.uid() OR a.provider_id = auth.uid())))
  WITH CHECK (true);

-- Ratings: lectura pública; cliente crea
CREATE POLICY "ratings lectura" ON public.provider_ratings FOR SELECT USING (true);
CREATE POLICY "ratings cliente crea" ON public.provider_ratings FOR INSERT WITH CHECK (auth.uid() = client_id);
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
-- Geografía de Costa Rica (concepto v1) — centroides de los 84 cantones
-- Fuente: promedio de coordenadas de distritos (github.com/josecarloscampos/LatLongCR, datos 2019)
-- agregadas a nivel de cantón. Monteverde (612) y Puerto Jiménez (613) se fijan a la
-- cabecera del cantón (no existían en el dataset 2019).
-- Uso: cálculo de distancias/proximidad (ver docs/skills/SKILL_PROXIMITY_SLOTS.md).
-- Precisión: aproximación suficiente para estimar distancias (~30 km/h); no es
-- geometría oficial del IGN. Apto para v1.

UPDATE public.cantones SET centroid_lat = 9.929427, centroid_lng = -84.089218 WHERE id = 101;
UPDATE public.cantones SET centroid_lat = 9.920695, centroid_lng = -84.146152 WHERE id = 102;
UPDATE public.cantones SET centroid_lat = 9.872597, centroid_lng = -84.071133 WHERE id = 103;
UPDATE public.cantones SET centroid_lat = 9.812069, centroid_lng = -84.350749 WHERE id = 104;
UPDATE public.cantones SET centroid_lat = 9.633319, centroid_lng = -84.051317 WHERE id = 105;
UPDATE public.cantones SET centroid_lat = 9.81153, centroid_lng = -84.10255 WHERE id = 106;
UPDATE public.cantones SET centroid_lat = 9.880295, centroid_lng = -84.272521 WHERE id = 107;
UPDATE public.cantones SET centroid_lat = 9.954163, centroid_lng = -84.027426 WHERE id = 108;
UPDATE public.cantones SET centroid_lat = 9.928384, centroid_lng = -84.197054 WHERE id = 109;
UPDATE public.cantones SET centroid_lat = 9.895595, centroid_lng = -84.107578 WHERE id = 110;
UPDATE public.cantones SET centroid_lat = 9.985912, centroid_lng = -83.992703 WHERE id = 111;
UPDATE public.cantones SET centroid_lat = 9.795432, centroid_lng = -84.203637 WHERE id = 112;
UPDATE public.cantones SET centroid_lat = 9.95618, centroid_lng = -84.083726 WHERE id = 113;
UPDATE public.cantones SET centroid_lat = 9.991866, centroid_lng = -84.027314 WHERE id = 114;
UPDATE public.cantones SET centroid_lat = 9.940417, centroid_lng = -84.032103 WHERE id = 115;
UPDATE public.cantones SET centroid_lat = 9.895863, centroid_lng = -84.457506 WHERE id = 116;
UPDATE public.cantones SET centroid_lat = 9.607259, centroid_lng = -83.955122 WHERE id = 117;
UPDATE public.cantones SET centroid_lat = 9.91457, centroid_lng = -84.02589 WHERE id = 118;
UPDATE public.cantones SET centroid_lat = 9.321916, centroid_lng = -83.653306 WHERE id = 119;
UPDATE public.cantones SET centroid_lat = 9.70133, centroid_lng = -84.066836 WHERE id = 120;
UPDATE public.cantones SET centroid_lat = 10.037463, centroid_lng = -84.238587 WHERE id = 201;
UPDATE public.cantones SET centroid_lat = 10.160238, centroid_lng = -84.50835 WHERE id = 202;
UPDATE public.cantones SET centroid_lat = 10.077174, centroid_lng = -84.322191 WHERE id = 203;
UPDATE public.cantones SET centroid_lat = 9.950466, centroid_lng = -84.551675 WHERE id = 204;
UPDATE public.cantones SET centroid_lat = 9.980061, centroid_lng = -84.400976 WHERE id = 205;
UPDATE public.cantones SET centroid_lat = 10.09172, centroid_lng = -84.37984 WHERE id = 206;
UPDATE public.cantones SET centroid_lat = 10.055224, centroid_lng = -84.436683 WHERE id = 207;
UPDATE public.cantones SET centroid_lat = 10.088056, centroid_lng = -84.243946 WHERE id = 208;
UPDATE public.cantones SET centroid_lat = 9.909442, centroid_lng = -84.544696 WHERE id = 209;
UPDATE public.cantones SET centroid_lat = 10.416393, centroid_lng = -84.490591 WHERE id = 210;
UPDATE public.cantones SET centroid_lat = 10.211094, centroid_lng = -84.404914 WHERE id = 211;
UPDATE public.cantones SET centroid_lat = 10.117705, centroid_lng = -84.308462 WHERE id = 212;
UPDATE public.cantones SET centroid_lat = 10.883565, centroid_lng = -85.087775 WHERE id = 213;
UPDATE public.cantones SET centroid_lat = 10.873192, centroid_lng = -84.723068 WHERE id = 214;
UPDATE public.cantones SET centroid_lat = 10.682796, centroid_lng = -84.869324 WHERE id = 215;
UPDATE public.cantones SET centroid_lat = 10.341539, centroid_lng = -84.216023 WHERE id = 216;
UPDATE public.cantones SET centroid_lat = 9.868654, centroid_lng = -83.938041 WHERE id = 301;
UPDATE public.cantones SET centroid_lat = 9.843262, centroid_lng = -83.843515 WHERE id = 302;
UPDATE public.cantones SET centroid_lat = 9.902615, centroid_lng = -83.98906 WHERE id = 303;
UPDATE public.cantones SET centroid_lat = 9.852098, centroid_lng = -83.723946 WHERE id = 304;
UPDATE public.cantones SET centroid_lat = 9.880076, centroid_lng = -83.624412 WHERE id = 305;
UPDATE public.cantones SET centroid_lat = 9.907765, centroid_lng = -83.800202 WHERE id = 306;
UPDATE public.cantones SET centroid_lat = 9.881942, centroid_lng = -83.884287 WHERE id = 307;
UPDATE public.cantones SET centroid_lat = 9.825362, centroid_lng = -83.978324 WHERE id = 308;
UPDATE public.cantones SET centroid_lat = 10.032238, centroid_lng = -84.125569 WHERE id = 401;
UPDATE public.cantones SET centroid_lat = 10.030568, centroid_lng = -84.125272 WHERE id = 402;
UPDATE public.cantones SET centroid_lat = 9.985474, centroid_lng = -84.070386 WHERE id = 403;
UPDATE public.cantones SET centroid_lat = 10.04021, centroid_lng = -84.158234 WHERE id = 404;
UPDATE public.cantones SET centroid_lat = 10.021097, centroid_lng = -84.093179 WHERE id = 405;
UPDATE public.cantones SET centroid_lat = 10.022013, centroid_lng = -84.058013 WHERE id = 406;
UPDATE public.cantones SET centroid_lat = 9.982451, centroid_lng = -84.181167 WHERE id = 407;
UPDATE public.cantones SET centroid_lat = 10.006685, centroid_lng = -84.157143 WHERE id = 408;
UPDATE public.cantones SET centroid_lat = 9.993524, centroid_lng = -84.094685 WHERE id = 409;
UPDATE public.cantones SET centroid_lat = 10.472699, centroid_lng = -84.013854 WHERE id = 410;
UPDATE public.cantones SET centroid_lat = 10.669648, centroid_lng = -85.48963 WHERE id = 501;
UPDATE public.cantones SET centroid_lat = 10.045083, centroid_lng = -85.444212 WHERE id = 502;
UPDATE public.cantones SET centroid_lat = 10.369285, centroid_lng = -85.663932 WHERE id = 503;
UPDATE public.cantones SET centroid_lat = 10.646663, centroid_lng = -85.192284 WHERE id = 504;
UPDATE public.cantones SET centroid_lat = 10.326801, centroid_lng = -85.572789 WHERE id = 505;
UPDATE public.cantones SET centroid_lat = 10.423609, centroid_lng = -85.110029 WHERE id = 506;
UPDATE public.cantones SET centroid_lat = 10.279723, centroid_lng = -84.955065 WHERE id = 507;
UPDATE public.cantones SET centroid_lat = 10.472767, centroid_lng = -84.969251 WHERE id = 508;
UPDATE public.cantones SET centroid_lat = 9.962307, centroid_lng = -85.265502 WHERE id = 509;
UPDATE public.cantones SET centroid_lat = 11.045218, centroid_lng = -85.626494 WHERE id = 510;
UPDATE public.cantones SET centroid_lat = 10.005973, centroid_lng = -85.412818 WHERE id = 511;
UPDATE public.cantones SET centroid_lat = 9.713675, centroid_lng = -85.039775 WHERE id = 601;
UPDATE public.cantones SET centroid_lat = 9.996838, centroid_lng = -84.640941 WHERE id = 602;
UPDATE public.cantones SET centroid_lat = 9.105447, centroid_lng = -83.275634 WHERE id = 603;
UPDATE public.cantones SET centroid_lat = 10.052907, centroid_lng = -84.728944 WHERE id = 604;
UPDATE public.cantones SET centroid_lat = 8.898871, centroid_lng = -83.521471 WHERE id = 605;
UPDATE public.cantones SET centroid_lat = 9.41774, centroid_lng = -84.047467 WHERE id = 606;
UPDATE public.cantones SET centroid_lat = 8.530736, centroid_lng = -83.168228 WHERE id = 607;
UPDATE public.cantones SET centroid_lat = 8.830379, centroid_lng = -82.980204 WHERE id = 608;
UPDATE public.cantones SET centroid_lat = 9.518638, centroid_lng = -84.330539 WHERE id = 609;
UPDATE public.cantones SET centroid_lat = 8.505433, centroid_lng = -82.888609 WHERE id = 610;
UPDATE public.cantones SET centroid_lat = 9.696635, centroid_lng = -84.625674 WHERE id = 611;
UPDATE public.cantones SET centroid_lat = 10.3, centroid_lng = -84.808 WHERE id = 612;
UPDATE public.cantones SET centroid_lat = 8.535, centroid_lng = -83.305 WHERE id = 613;
UPDATE public.cantones SET centroid_lat = 9.899986, centroid_lng = -83.291392 WHERE id = 701;
UPDATE public.cantones SET centroid_lat = 10.376862, centroid_lng = -83.688817 WHERE id = 702;
UPDATE public.cantones SET centroid_lat = 10.095962, centroid_lng = -83.528992 WHERE id = 703;
UPDATE public.cantones SET centroid_lat = 9.605563, centroid_lng = -82.904691 WHERE id = 704;
UPDATE public.cantones SET centroid_lat = 10.062666, centroid_lng = -83.291649 WHERE id = 705;
UPDATE public.cantones SET centroid_lat = 10.230981, centroid_lng = -83.629864 WHERE id = 706;
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

-- ============================================================
-- REBUILD LIMPIO v1 — ETAPA 6: GRANTS (privilegios de rol)
-- ============================================================
-- En Supabase, anon/authenticated necesitan GRANT a nivel tabla; RLS sigue
-- controlando QUÉ filas se ven. Sin esto: "permission denied for table".

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- ===== 20260629000000_storage_avatars.sql =====
-- Storage: buckets públicos (avatars, service-gallery, Certification Documents) + políticas RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar upload own" ON storage.objects;
CREATE POLICY "Avatar upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
CREATE POLICY "Avatar update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar delete own" ON storage.objects;
CREATE POLICY "Avatar delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Bucket galería de servicios
INSERT INTO storage.buckets (id, name, public) VALUES ('service-gallery', 'service-gallery', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "Gallery upload own" ON storage.objects;
CREATE POLICY "Gallery upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'service-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Gallery update own" ON storage.objects;
CREATE POLICY "Gallery update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'service-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Gallery delete own" ON storage.objects;
CREATE POLICY "Gallery delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'service-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Gallery public read" ON storage.objects;
CREATE POLICY "Gallery public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'service-gallery');

-- Bucket certificaciones
INSERT INTO storage.buckets (id, name, public) VALUES ('Certification Documents', 'Certification Documents', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "Cert upload own" ON storage.objects;
CREATE POLICY "Cert upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'Certification Documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Cert update own" ON storage.objects;
CREATE POLICY "Cert update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'Certification Documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Cert delete own" ON storage.objects;
CREATE POLICY "Cert delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'Certification Documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Cert public read" ON storage.objects;
CREATE POLICY "Cert public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'Certification Documents');

-- ===== 20260629000001_rpc_provider_with_certifications.sql =====
DROP FUNCTION IF EXISTS public.get_provider_by_slug(text);
-- Actualiza get_provider_by_slug para incluir certification_files
CREATE OR REPLACE FUNCTION public.get_provider_by_slug(p_slug text)
RETURNS TABLE(
  id uuid, name text, slug text, avatar_url text,
  about_me text, experience_years integer, average_rating numeric,
  canton_base_id integer, certification_files jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id, u.name, u.slug, u.avatar_url, u.about_me,
         u.experience_years, u.average_rating, u.canton_base_id,
         u.certification_files
  FROM public.users u
  WHERE u.slug = p_slug AND u.role = 'provider' AND u.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_by_slug(text) TO anon, authenticated;

-- ===== 20260629000002_provider_route_filters.sql =====
-- Filtros de ruta del proveedor: días de la semana restringidos por provincia/cantón
CREATE TABLE IF NOT EXISTS public.provider_route_filters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=lun … 6=dom
  province_ids jsonb NOT NULL DEFAULT '[]',  -- array de provincia_id (int)
  canton_ids   jsonb NOT NULL DEFAULT '[]',  -- array de canton_id (int)
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, day_of_week)
);

ALTER TABLE public.provider_route_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Provider lee sus filtros" ON public.provider_route_filters;
CREATE POLICY "Provider lee sus filtros" ON public.provider_route_filters
  FOR SELECT TO authenticated USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Provider inserta sus filtros" ON public.provider_route_filters;
CREATE POLICY "Provider inserta sus filtros" ON public.provider_route_filters
  FOR INSERT TO authenticated WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Provider actualiza sus filtros" ON public.provider_route_filters;
CREATE POLICY "Provider actualiza sus filtros" ON public.provider_route_filters
  FOR UPDATE TO authenticated USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Provider elimina sus filtros" ON public.provider_route_filters;
CREATE POLICY "Provider elimina sus filtros" ON public.provider_route_filters
  FOR DELETE TO authenticated USING (provider_id = auth.uid());

-- Lectura pública para que el booking link pueda consultar los filtros
DROP POLICY IF EXISTS "Público lee filtros de ruta" ON public.provider_route_filters;
CREATE POLICY "Público lee filtros de ruta" ON public.provider_route_filters
  FOR SELECT TO anon USING (true);

GRANT SELECT ON public.provider_route_filters TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.provider_route_filters TO authenticated;

-- ===== 20260630000000_cover_theme.sql =====
-- Tema de portada del proveedor para el link de reserva
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cover_theme text NOT NULL DEFAULT 'coral';

-- Actualiza el RPC get_provider_by_slug para incluir cover_theme
DROP FUNCTION IF EXISTS public.get_provider_by_slug(text);
CREATE FUNCTION public.get_provider_by_slug(p_slug text)
RETURNS TABLE(
  id uuid, name text, slug text, avatar_url text,
  about_me text, experience_years integer, average_rating numeric,
  canton_base_id integer, certification_files jsonb, cover_theme text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id, u.name, u.slug, u.avatar_url, u.about_me,
         u.experience_years, u.average_rating, u.canton_base_id,
         u.certification_files, u.cover_theme
  FROM public.users u
  WHERE u.slug = p_slug AND u.role = 'provider' AND u.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_by_slug(text) TO anon, authenticated;

-- ===== 20260630000001_avatar_rpc.sql =====
-- RPC para actualizar avatar_url de forma segura (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_my_avatar_url(p_avatar_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE public.users
  SET avatar_url = p_avatar_url
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_avatar_url(text) TO authenticated;

-- Política de storage más permisiva para upload autenticado
-- (la anterior puede fallar por foldername en algunas versiones del CLI)
DROP POLICY IF EXISTS "Avatar upload own" ON storage.objects;
CREATE POLICY "Avatar upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
CREATE POLICY "Avatar update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar delete own" ON storage.objects;
CREATE POLICY "Avatar delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- RPC para actualizar datos del perfil (nombre, teléfono, about_me, cover_theme)
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_name text,
  p_phone text DEFAULT NULL,
  p_about_me text DEFAULT NULL,
  p_cover_theme text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE public.users
  SET
    name       = p_name,
    phone      = COALESCE(p_phone, phone),
    about_me   = COALESCE(p_about_me, about_me),
    cover_theme = COALESCE(p_cover_theme, cover_theme)
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text) TO authenticated;

-- ===== 20260630000002_update_my_profile_rpc.sql =====
-- RPC para actualizar datos del perfil sin depender de RLS en users
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_name text,
  p_phone text DEFAULT NULL,
  p_about_me text DEFAULT NULL,
  p_cover_theme text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE public.users
  SET
    name        = p_name,
    phone       = COALESCE(p_phone, phone),
    about_me    = COALESCE(p_about_me, about_me),
    cover_theme = COALESCE(p_cover_theme, cover_theme)
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text) TO authenticated;

-- ===== 20260630000003_fix_avatar_update_policy.sql =====
-- La política de UPDATE en storage necesita WITH CHECK para que funcione el upsert
DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
CREATE POLICY "Avatar update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- ===== 20260630000004_provider_slug_service_type.sql =====
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

-- ===== 20260630000005_team_members.sql =====
-- Tabla de miembros del equipo del proveedor
CREATE TABLE IF NOT EXISTS public.provider_team_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.provider_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members: owner full access" ON public.provider_team_members;
CREATE POLICY "Team members: owner full access" ON public.provider_team_members
  FOR ALL TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Team members: public read" ON public.provider_team_members;
CREATE POLICY "Team members: public read" ON public.provider_team_members
  FOR SELECT TO anon, authenticated
  USING (true);

-- Campo en appointments para asignar el miembro responsable
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES public.provider_team_members(id) ON DELETE SET NULL;

-- Índice para consultas por proveedor
CREATE INDEX IF NOT EXISTS idx_provider_team_members_provider ON public.provider_team_members(provider_id);

-- ===== 20260701000001_route_filter_surcharge.sql =====
-- Agrega recargo por transporte a los filtros de zona por día.
-- El recargo se cobra a clientes que reservan fuera de la zona asignada ese día.
ALTER TABLE provider_route_filters
  ADD COLUMN IF NOT EXISTS transport_surcharge_pct integer NOT NULL DEFAULT 0;

-- ===== 20260701000002_service_catalog_v2.sql =====
-- Catálogo de servicios v2: 6 categorías, 30 tipos.
-- Aplica sobre un DB limpio (sin listings ni service_types existentes).

-- Categorías
INSERT INTO service_categories (id, name, label, icon) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','home','Hogar','home'),
  ('aaaaaaaa-0000-0000-0000-000000000002','pets','Mascotas','paw-print'),
  ('aaaaaaaa-0000-0000-0000-000000000003','classes','Clases','book-open'),
  ('aaaaaaaa-0000-0000-0000-000000000004','personal-care','Cuidado Personal','heart'),
  ('aaaaaaaa-0000-0000-0000-000000000005','sports','Deportes','activity'),
  ('aaaaaaaa-0000-0000-0000-000000000006','other','Otros','more-horizontal')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon;

-- Tipos de servicio (IDs autogenerados por gen_random_uuid())
INSERT INTO service_types (name, category_id) VALUES
  -- Hogar
  ('Limpieza',               'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Lavacar',                'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Fumigación',             'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Jardinería',             'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Hidrolavado',            'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Planchado',              'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Chef Privado',           'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Flores a domicilio',     'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Mantenimiento',          'aaaaaaaa-0000-0000-0000-000000000001'),
  -- Mascotas
  ('Paseo de perros',        'aaaaaaaa-0000-0000-0000-000000000002'),
  ('Pet Grooming',           'aaaaaaaa-0000-0000-0000-000000000002'),
  ('Veterinario',            'aaaaaaaa-0000-0000-0000-000000000002'),
  -- Clases
  ('Tutorías primaria y secundaria', 'aaaaaaaa-0000-0000-0000-000000000003'),
  ('Idiomas',                'aaaaaaaa-0000-0000-0000-000000000003'),
  ('Música',                 'aaaaaaaa-0000-0000-0000-000000000003'),
  ('Pintura',                'aaaaaaaa-0000-0000-0000-000000000003'),
  -- Cuidado Personal
  ('Fisioterapia',           'aaaaaaaa-0000-0000-0000-000000000004'),
  ('Masajes',                'aaaaaaaa-0000-0000-0000-000000000004'),
  ('Manicurista',            'aaaaaaaa-0000-0000-0000-000000000004'),
  ('Peluquería',             'aaaaaaaa-0000-0000-0000-000000000004'),
  ('Depilación',             'aaaaaaaa-0000-0000-0000-000000000004'),
  -- Deportes
  ('Entrenador Personal',    'aaaaaaaa-0000-0000-0000-000000000005'),
  ('Mantenimiento Bicicletas','aaaaaaaa-0000-0000-0000-000000000005'),
  ('Yoga',                   'aaaaaaaa-0000-0000-0000-000000000005'),
  ('Pilates',                'aaaaaaaa-0000-0000-0000-000000000005'),
  ('Tenis',                  'aaaaaaaa-0000-0000-0000-000000000005'),
  -- Otros
  ('Fotógrafo',              'aaaaaaaa-0000-0000-0000-000000000006'),
  ('Niñera',                 'aaaaaaaa-0000-0000-0000-000000000006'),
  ('Enfermería',             'aaaaaaaa-0000-0000-0000-000000000006'),
  ('Cuidado adulto mayor',   'aaaaaaaa-0000-0000-0000-000000000006');

-- ===== 20260701000003_sync_slots_with_availability.sql =====
-- Función para sincronizar provider_time_slots con la configuración de disponibilidad.
-- Lee desde provider_availability (fuente de verdad para slots) y listings.availability (para días deshabilitados).
-- 1. Elimina slots futuros no-reservados/no-bloqueados de días ahora desactivados.
-- 2. Elimina slots futuros que caen fuera de los nuevos rangos horarios.
-- 3. Genera nuevos slots para las horas/días habilitados (60 días hacia adelante).

CREATE OR REPLACE FUNCTION public.sync_slots_with_availability(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
  v_availability JSONB;
  v_slots_deleted_days INTEGER := 0;
  v_slots_deleted_times INTEGER := 0;
  v_slots_created INTEGER := 0;
BEGIN
  SELECT provider_id, availability
  INTO v_provider_id, v_availability
  FROM listings
  WHERE id = p_listing_id;

  IF v_provider_id IS NULL THEN
    RAISE LOG 'sync_slots_with_availability: listing % no encontrado', p_listing_id;
    RETURN 0;
  END IF;

  -- PASO 1: Eliminar slots de días deshabilitados (futuros, no reservados, no bloqueados manualmente)
  IF v_availability IS NOT NULL THEN
    DELETE FROM provider_time_slots
    WHERE listing_id = p_listing_id
      AND slot_date >= CURRENT_DATE
      AND is_reserved = false
      AND (slot_type IS NULL OR slot_type != 'manually_blocked')
      AND NOT EXISTS (
        SELECT 1
        FROM (
          SELECT key AS day_name, (value->>'enabled')::boolean AS enabled
          FROM jsonb_each(v_availability)
        ) cfg
        WHERE cfg.enabled = true
          AND CASE EXTRACT(DOW FROM slot_date)
                WHEN 0 THEN 'sunday'
                WHEN 1 THEN 'monday'
                WHEN 2 THEN 'tuesday'
                WHEN 3 THEN 'wednesday'
                WHEN 4 THEN 'thursday'
                WHEN 5 THEN 'friday'
                WHEN 6 THEN 'saturday'
              END = cfg.day_name
      );
    GET DIAGNOSTICS v_slots_deleted_days = ROW_COUNT;
  END IF;

  -- PASO 2: Eliminar slots fuera de los rangos horarios configurados
  DELETE FROM provider_time_slots pts
  WHERE pts.listing_id = p_listing_id
    AND pts.slot_date >= CURRENT_DATE
    AND pts.is_reserved = false
    AND (pts.slot_type IS NULL OR pts.slot_type != 'manually_blocked')
    AND NOT EXISTS (
      SELECT 1
      FROM provider_availability pa
      WHERE pa.provider_id = v_provider_id
        AND pa.is_active = true
        AND pa.day_of_week = EXTRACT(DOW FROM pts.slot_date)::integer
        AND pts.start_time >= pa.start_time
        AND pts.start_time < pa.end_time
    );
  GET DIAGNOSTICS v_slots_deleted_times = ROW_COUNT;

  -- PASO 3: Generar nuevos slots para rangos habilitados (60 días)
  SELECT generate_provider_time_slots_for_listing(v_provider_id, p_listing_id, 60)
  INTO v_slots_created;

  RAISE LOG 'sync_slots_with_availability: listing=% eliminados_dias=% eliminados_horarios=% creados=%',
    p_listing_id, v_slots_deleted_days, v_slots_deleted_times, v_slots_created;

  RETURN v_slots_created;
END;
$$;

-- Asegurar que el RPC sea accesible desde el cliente
GRANT EXECUTE ON FUNCTION public.sync_slots_with_availability(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_slots_with_availability(UUID) TO anon;

-- ===== 20260702000001_claim_appointment_as_client.sql =====
-- RPC para que un cliente autenticado vincule un appointment creado por create_external_booking
-- (que inserta client_id = NULL). RLS no permite el UPDATE directo porque client_id es NULL.
CREATE OR REPLACE FUNCTION public.claim_appointment_as_client(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE appointments
  SET
    client_id       = v_user_id,
    external_booking = false,
    created_from    = 'client_app'
  WHERE id = p_appointment_id
    AND client_id IS NULL;  -- solo si aún no tiene dueño (evita secuestro)

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo vincular el appointment: no existe o ya tiene cliente asignado';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_appointment_as_client(uuid) TO authenticated;

