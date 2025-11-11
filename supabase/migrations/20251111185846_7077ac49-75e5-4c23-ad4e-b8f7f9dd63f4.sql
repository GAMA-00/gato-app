-- Optimización de políticas RLS para evitar re-evaluación de auth.uid() en cada fila
-- Reemplaza auth.uid() con (select auth.uid()) para mejor rendimiento

-- 1. Tabla: recurring_instances
DROP POLICY IF EXISTS "Users can manage instances of their recurring rules" ON recurring_instances;
CREATE POLICY "Users can manage instances of their recurring rules"
ON recurring_instances
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM recurring_rules rr
    WHERE rr.id = recurring_instances.recurring_rule_id
      AND ((select auth.uid()) = rr.provider_id OR (select auth.uid()) = rr.client_id)
  )
);

DROP POLICY IF EXISTS "Users can view instances of their recurring rules" ON recurring_instances;
CREATE POLICY "Users can view instances of their recurring rules"
ON recurring_instances
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM recurring_rules rr
    WHERE rr.id = recurring_instances.recurring_rule_id
      AND ((select auth.uid()) = rr.provider_id OR (select auth.uid()) = rr.client_id)
  )
);

-- 2. Tabla: recurring_appointment_instances
DROP POLICY IF EXISTS "System can create recurring instances" ON recurring_appointment_instances;
CREATE POLICY "System can create recurring instances"
ON recurring_appointment_instances
FOR INSERT
TO public
WITH CHECK (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1
    FROM recurring_rules
    WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id
      AND recurring_rules.client_id = (select auth.uid())
  )
);

-- 3. Tabla: recurring_exceptions
DROP POLICY IF EXISTS "Clients can manage their recurring exceptions" ON recurring_exceptions;
CREATE POLICY "Clients can manage their recurring exceptions"
ON recurring_exceptions
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM appointments
    WHERE appointments.id = recurring_exceptions.appointment_id
      AND appointments.client_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM appointments
    WHERE appointments.id = recurring_exceptions.appointment_id
      AND appointments.client_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Providers can manage their recurring exceptions" ON recurring_exceptions;
CREATE POLICY "Providers can manage their recurring exceptions"
ON recurring_exceptions
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM appointments
    WHERE appointments.id = recurring_exceptions.appointment_id
      AND appointments.provider_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM appointments
    WHERE appointments.id = recurring_exceptions.appointment_id
      AND appointments.provider_id = (select auth.uid())
  )
);

-- 4. Tabla: post_payment_invoices
DROP POLICY IF EXISTS "Clients can update invoice approval status" ON post_payment_invoices;
CREATE POLICY "Clients can update invoice approval status"
ON post_payment_invoices
FOR UPDATE
TO public
USING (
  (select auth.uid()) = client_id AND status = 'submitted'
)
WITH CHECK (
  (select auth.uid()) = client_id AND status IN ('approved', 'rejected')
);

DROP POLICY IF EXISTS "Clients can view and approve their invoices" ON post_payment_invoices;
CREATE POLICY "Clients can view and approve their invoices"
ON post_payment_invoices
FOR SELECT
TO public
USING (
  (select auth.uid()) = client_id
);

DROP POLICY IF EXISTS "Providers can manage their invoices" ON post_payment_invoices;
CREATE POLICY "Providers can manage their invoices"
ON post_payment_invoices
FOR ALL
TO public
USING (
  (select auth.uid()) = provider_id
)
WITH CHECK (
  (select auth.uid()) = provider_id
);

-- 5. Tabla: email_logs
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;
CREATE POLICY "Admins can view email logs"
ON email_logs
FOR SELECT
TO authenticated
USING (
  has_role((select auth.uid()), 'admin'::app_role)
);