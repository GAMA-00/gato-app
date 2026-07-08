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
