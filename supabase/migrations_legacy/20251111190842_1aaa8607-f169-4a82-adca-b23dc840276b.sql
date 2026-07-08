-- Consolidación de políticas RLS para mejor rendimiento
-- Combina múltiples políticas permisivas en políticas únicas usando OR
-- Sin cambiar la lógica de acceso

-- ============================================================
-- TABLA: appointments - Consolidar políticas SELECT (3 → 1)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Providers can view their appointments" ON public.appointments;

CREATE POLICY "Unified: Users can view their appointments"
ON public.appointments
FOR SELECT
USING (
  -- Admins ven todas las citas
  has_role((select auth.uid()), 'admin'::app_role)
  OR
  -- Clients ven sus citas
  (select auth.uid()) = client_id
  OR
  -- Providers ven sus citas
  (select auth.uid()) = provider_id
);

-- ============================================================
-- TABLA: appointments - Consolidar políticas UPDATE (3 → 1)
-- ============================================================

DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Providers can update appointments they own" ON public.appointments;

CREATE POLICY "Unified: Users can update their appointments"
ON public.appointments
FOR UPDATE
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR
  (select auth.uid()) = client_id
  OR
  (select auth.uid()) = provider_id
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR
  (select auth.uid()) = client_id
  OR
  (select auth.uid()) = provider_id
);

-- ============================================================
-- TABLA: invoices - Consolidar políticas SELECT (2 → 1)
-- ============================================================
-- Nota: La política "Service role can manage all invoices" se mantiene
-- separada porque es FOR ALL, no solo SELECT

DROP POLICY IF EXISTS "Clients can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Providers can view their invoices" ON public.invoices;

CREATE POLICY "Unified: Users can view their invoices"
ON public.invoices
FOR SELECT
USING (
  -- Service role ve todo (para operaciones de sistema)
  auth.role() = 'service_role'
  OR
  -- Clients ven sus facturas
  (select auth.uid()) = client_id
  OR
  -- Providers ven sus facturas
  (select auth.uid()) = provider_id
);

-- ============================================================
-- RESUMEN DE OPTIMIZACIÓN
-- ============================================================
-- ✅ appointments SELECT: 3 políticas → 1 política consolidada
-- ✅ appointments UPDATE: 3 políticas → 1 política consolidada
-- ✅ invoices SELECT: 2 políticas → 1 política consolidada
-- 
-- Mejora de rendimiento: PostgreSQL ahora evalúa una única política
-- en lugar de múltiples políticas por cada fila, reduciendo significativamente
-- el overhead de evaluación de RLS.
-- 
-- Garantía: La lógica de acceso es IDÉNTICA, solo consolidada con OR.