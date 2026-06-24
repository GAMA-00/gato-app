-- Consolidación de políticas RLS restantes para tablas post_payment y provider_availability

-- =============================================
-- 1. post_payment_evidence: Consolidar SELECT (2 → 1)
-- =============================================
DROP POLICY IF EXISTS "Clients can view evidence for their appointments" ON public.post_payment_evidence;
DROP POLICY IF EXISTS "Providers can manage their post payment evidence" ON public.post_payment_evidence;

-- Política SELECT unificada
CREATE POLICY "Unified: Users can view post payment evidence"
ON public.post_payment_evidence
FOR SELECT
TO authenticated
USING (
  -- Providers ven su evidencia
  (select auth.uid()) = provider_id
  OR
  -- Clients ven evidencia de sus appointments
  EXISTS (
    SELECT 1
    FROM appointments
    WHERE appointments.id = post_payment_evidence.appointment_id
      AND appointments.client_id = (select auth.uid())
  )
);

-- Mantener política ALL para providers (gestión completa)
CREATE POLICY "Providers can manage their post payment evidence"
ON public.post_payment_evidence
FOR ALL
TO authenticated
USING ((select auth.uid()) = provider_id)
WITH CHECK ((select auth.uid()) = provider_id);

-- =============================================
-- 2. post_payment_invoices: Consolidar SELECT (2 → 1)
-- =============================================
DROP POLICY IF EXISTS "Clients can view and approve their invoices" ON public.post_payment_invoices;
DROP POLICY IF EXISTS "Providers can manage their invoices" ON public.post_payment_invoices;

-- Política SELECT unificada
CREATE POLICY "Unified: Users can view their post payment invoices"
ON public.post_payment_invoices
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR
  (select auth.uid()) = provider_id
);

-- =============================================
-- 3. post_payment_invoices: Consolidar UPDATE (2 → 1)
-- =============================================
DROP POLICY IF EXISTS "Clients can update invoice approval status" ON public.post_payment_invoices;

-- Política UPDATE unificada (clients aprueban, providers gestionan)
CREATE POLICY "Unified: Users can update their post payment invoices"
ON public.post_payment_invoices
FOR UPDATE
TO authenticated
USING (
  -- Clients pueden actualizar status de aprobación
  ((select auth.uid()) = client_id AND status = 'submitted')
  OR
  -- Providers pueden gestionar sus invoices
  (select auth.uid()) = provider_id
)
WITH CHECK (
  -- Clients solo pueden aprobar/rechazar
  ((select auth.uid()) = client_id AND status IN ('approved', 'rejected'))
  OR
  -- Providers tienen control total
  (select auth.uid()) = provider_id
);

-- =============================================
-- 4. post_payment_items: Consolidar SELECT (2 → 1)
-- =============================================
DROP POLICY IF EXISTS "Clients can view items for their invoices" ON public.post_payment_items;
DROP POLICY IF EXISTS "Providers can manage items for their invoices" ON public.post_payment_items;

-- Política SELECT unificada
CREATE POLICY "Unified: Users can view their invoice items"
ON public.post_payment_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM post_payment_invoices
    WHERE post_payment_invoices.id = post_payment_items.invoice_id
      AND (
        post_payment_invoices.client_id = (select auth.uid())
        OR
        post_payment_invoices.provider_id = (select auth.uid())
      )
  )
);

-- Mantener política ALL para providers (gestión de items)
CREATE POLICY "Providers can manage items for their invoices"
ON public.post_payment_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM post_payment_invoices
    WHERE post_payment_invoices.id = post_payment_items.invoice_id
      AND post_payment_invoices.provider_id = (select auth.uid())
  )
);

-- =============================================
-- 5. provider_availability: Consolidar SELECT (2 → 1)
-- =============================================
DROP POLICY IF EXISTS "Clients can view provider availability" ON public.provider_availability;
DROP POLICY IF EXISTS "Providers can manage their availability" ON public.provider_availability;

-- Política SELECT pública (cualquiera puede ver disponibilidad)
CREATE POLICY "Public can view provider availability"
ON public.provider_availability
FOR SELECT
TO public
USING (is_active = true);

-- Política ALL para providers (gestión completa)
CREATE POLICY "Providers can manage their availability"
ON public.provider_availability
FOR ALL
TO authenticated
USING ((select auth.uid()) = provider_id)
WITH CHECK ((select auth.uid()) = provider_id);