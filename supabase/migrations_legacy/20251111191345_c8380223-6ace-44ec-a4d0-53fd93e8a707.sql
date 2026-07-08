-- Corrección final de warnings de RLS: auth initplan y múltiples políticas permisivas

-- =============================================
-- 1. recurring_appointment_instances: Fix auth.role() initplan
-- =============================================
DROP POLICY IF EXISTS "System can create recurring instances" ON public.recurring_appointment_instances;

CREATE POLICY "System can create recurring instances"
ON public.recurring_appointment_instances
FOR INSERT
TO public
WITH CHECK (
  (select auth.role()) = 'service_role' OR
  EXISTS (
    SELECT 1
    FROM recurring_rules
    WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id
      AND recurring_rules.client_id = (select auth.uid())
  )
);

-- =============================================
-- 2. appointments: Consolidar políticas INSERT (2 → 1)
-- =============================================
DROP POLICY IF EXISTS "Allow public creation of external appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can create appointment requests" ON public.appointments;

-- Política unificada que permite tanto external bookings como client requests
CREATE POLICY "Unified: Allow appointment creation"
ON public.appointments
FOR INSERT
TO public
WITH CHECK (
  -- External bookings (público, sin auth)
  (external_booking = true AND status = 'pending')
  OR
  -- Client requests (autenticado)
  ((select auth.uid()) = client_id AND status = 'pending' AND created_by_user = client_id)
);

-- =============================================
-- 3. onvopay_subscriptions: Consolidar SELECT (3 → 1 + service_role)
-- =============================================
DROP POLICY IF EXISTS "Clients can view their subscriptions" ON public.onvopay_subscriptions;
DROP POLICY IF EXISTS "Providers can view their subscriptions" ON public.onvopay_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.onvopay_subscriptions;

-- Política unificada para usuarios autenticados
CREATE POLICY "Unified: Users can view their subscriptions"
ON public.onvopay_subscriptions
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = client_id
  OR
  (select auth.uid()) = provider_id
);

-- Service role separado para control total
CREATE POLICY "Service role can manage all subscriptions"
ON public.onvopay_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- 4. onvopay_subscriptions: Consolidar UPDATE (2 → 1 + service_role)
-- =============================================
DROP POLICY IF EXISTS "Clients can update their subscriptions" ON public.onvopay_subscriptions;

-- Política UPDATE solo para clientes autenticados
CREATE POLICY "Clients can update their subscriptions"
ON public.onvopay_subscriptions
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = client_id)
WITH CHECK ((select auth.uid()) = client_id);

-- NOTA: Service role ya tiene acceso total con la política FOR ALL creada arriba