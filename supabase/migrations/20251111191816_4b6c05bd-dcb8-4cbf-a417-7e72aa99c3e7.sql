-- Consolidación final de TODAS las políticas RLS duplicadas
-- Convertir políticas ALL en operaciones específicas y unificar SELECT

-- =============================================
-- 1. post_payment_evidence: Separar ALL en operaciones específicas
-- =============================================
DROP POLICY IF EXISTS "Providers can manage their post payment evidence" ON public.post_payment_evidence;

-- INSERT, UPDATE, DELETE separados (no ALL que incluye SELECT)
CREATE POLICY "Providers can insert their post payment evidence"
ON public.post_payment_evidence
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = provider_id);

CREATE POLICY "Providers can update their post payment evidence"
ON public.post_payment_evidence
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = provider_id)
WITH CHECK ((select auth.uid()) = provider_id);

CREATE POLICY "Providers can delete their post payment evidence"
ON public.post_payment_evidence
FOR DELETE
TO authenticated
USING ((select auth.uid()) = provider_id);

-- =============================================
-- 2. post_payment_items: Separar ALL en operaciones específicas
-- =============================================
DROP POLICY IF EXISTS "Providers can manage items for their invoices" ON public.post_payment_items;

CREATE POLICY "Providers can insert invoice items"
ON public.post_payment_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM post_payment_invoices
    WHERE post_payment_invoices.id = post_payment_items.invoice_id
      AND post_payment_invoices.provider_id = (select auth.uid())
  )
);

CREATE POLICY "Providers can update invoice items"
ON public.post_payment_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM post_payment_invoices
    WHERE post_payment_invoices.id = post_payment_items.invoice_id
      AND post_payment_invoices.provider_id = (select auth.uid())
  )
);

CREATE POLICY "Providers can delete invoice items"
ON public.post_payment_items
FOR DELETE
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
-- 3. provider_availability: Separar ALL en operaciones específicas
-- =============================================
DROP POLICY IF EXISTS "Providers can manage their availability" ON public.provider_availability;

CREATE POLICY "Providers can insert their availability"
ON public.provider_availability
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = provider_id);

CREATE POLICY "Providers can update their availability"
ON public.provider_availability
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = provider_id)
WITH CHECK ((select auth.uid()) = provider_id);

CREATE POLICY "Providers can delete their availability"
ON public.provider_availability
FOR DELETE
TO authenticated
USING ((select auth.uid()) = provider_id);

-- =============================================
-- 4. provider_ratings: Consolidar SELECT (2 → 1)
-- =============================================
DROP POLICY IF EXISTS "Clients can view their own ratings" ON public.provider_ratings;
DROP POLICY IF EXISTS "Providers can view ratings about them" ON public.provider_ratings;

CREATE POLICY "Unified: Users can view ratings"
ON public.provider_ratings
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR
  (select auth.uid()) = provider_id
);

-- =============================================
-- 5. provider_time_slots: Consolidar SELECT (3 → 1 + service_role)
-- =============================================
DROP POLICY IF EXISTS "Clients can view available slots" ON public.provider_time_slots;
DROP POLICY IF EXISTS "Providers can view their slots" ON public.provider_time_slots;
DROP POLICY IF EXISTS "System functions can manage all slots" ON public.provider_time_slots;

-- SELECT público para disponibilidad
CREATE POLICY "Public can view available slots"
ON public.provider_time_slots
FOR SELECT
TO public
USING (
  is_available = true
  OR
  (select auth.uid()) = provider_id
);

-- System (service_role) con control total
CREATE POLICY "System functions can manage all slots"
ON public.provider_time_slots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- 6. recurring_appointment_instances: Consolidar
-- =============================================
DROP POLICY IF EXISTS "Clients can view their recurring instances" ON public.recurring_appointment_instances;
DROP POLICY IF EXISTS "Providers can manage their recurring instances" ON public.recurring_appointment_instances;
DROP POLICY IF EXISTS "Providers can view their recurring instances" ON public.recurring_appointment_instances;

-- SELECT unificado
CREATE POLICY "Unified: Users can view their recurring instances"
ON public.recurring_appointment_instances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recurring_rules
    WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id
      AND (
        recurring_rules.client_id = (select auth.uid())
        OR
        recurring_rules.provider_id = (select auth.uid())
      )
  )
);

-- INSERT (mantener la que ya está optimizada con System can create)

-- UPDATE y DELETE para providers
CREATE POLICY "Providers can update their recurring instances"
ON public.recurring_appointment_instances
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recurring_rules
    WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id
      AND recurring_rules.provider_id = (select auth.uid())
  )
);

CREATE POLICY "Providers can delete their recurring instances"
ON public.recurring_appointment_instances
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recurring_rules
    WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id
      AND recurring_rules.provider_id = (select auth.uid())
  )
);

-- =============================================
-- 7. recurring_exceptions: Consolidar (2 ALL → 1 política por operación)
-- =============================================
DROP POLICY IF EXISTS "Clients can manage their recurring exceptions" ON public.recurring_exceptions;
DROP POLICY IF EXISTS "Providers can manage their recurring exceptions" ON public.recurring_exceptions;

-- SELECT unificado
CREATE POLICY "Unified: Users can view recurring exceptions"
ON public.recurring_exceptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM appointments
    WHERE appointments.id = recurring_exceptions.appointment_id
      AND (
        appointments.client_id = (select auth.uid())
        OR
        appointments.provider_id = (select auth.uid())
      )
  )
);

-- INSERT unificado
CREATE POLICY "Unified: Users can create recurring exceptions"
ON public.recurring_exceptions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM appointments
    WHERE appointments.id = recurring_exceptions.appointment_id
      AND (
        appointments.client_id = (select auth.uid())
        OR
        appointments.provider_id = (select auth.uid())
      )
  )
);

-- UPDATE unificado
CREATE POLICY "Unified: Users can update recurring exceptions"
ON public.recurring_exceptions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM appointments
    WHERE appointments.id = recurring_exceptions.appointment_id
      AND (
        appointments.client_id = (select auth.uid())
        OR
        appointments.provider_id = (select auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM appointments
    WHERE appointments.id = recurring_exceptions.appointment_id
      AND (
        appointments.client_id = (select auth.uid())
        OR
        appointments.provider_id = (select auth.uid())
      )
  )
);

-- DELETE unificado
CREATE POLICY "Unified: Users can delete recurring exceptions"
ON public.recurring_exceptions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM appointments
    WHERE appointments.id = recurring_exceptions.appointment_id
      AND (
        appointments.client_id = (select auth.uid())
        OR
        appointments.provider_id = (select auth.uid())
      )
  )
);