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
