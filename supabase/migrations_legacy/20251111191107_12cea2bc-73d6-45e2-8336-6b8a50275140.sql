-- Consolidación y restricción de políticas por rol para eliminar "multiple permissive policies"
-- Sin cambiar la lógica de acceso efectiva

-- =====================
-- invoices
-- =====================
DROP POLICY IF EXISTS "Unified: Users can view their invoices" ON public.invoices;
DROP POLICY IF EXISTS "Clients can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Providers can view their invoices" ON public.invoices;
DROP POLICY IF EXISTS "Service role can manage all invoices" ON public.invoices;

-- Solo usuarios autenticados (incluye admins mediante has_role)
CREATE POLICY "Unified: Users can view their invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR (select auth.uid()) = client_id
  OR (select auth.uid()) = provider_id
);

-- Service role mantiene control total pero limitado al rol service_role
CREATE POLICY "Service role can manage all invoices"
ON public.invoices
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================
-- listings
-- =====================
DROP POLICY IF EXISTS "Allow public read access to listings" ON public.listings;
DROP POLICY IF EXISTS "Anyone can view listings" ON public.listings;

-- Política única, pública, solo listings activos
CREATE POLICY "Public can view active listings"
ON public.listings
FOR SELECT
TO public
USING (is_active = true);

-- =====================
-- onvopay_customers
-- =====================
DROP POLICY IF EXISTS "Clients can view their own customer mappings" ON public.onvopay_customers;
DROP POLICY IF EXISTS "Service role can manage all customer mappings" ON public.onvopay_customers;
DROP POLICY IF EXISTS "Service role can manage onvopay customers" ON public.onvopay_customers;

-- Solo autenticados ven su propio registro
CREATE POLICY "Clients can view their own customer mappings"
ON public.onvopay_customers
FOR SELECT
TO authenticated
USING ((select auth.uid()) = client_id);

-- Service role con control total, restringido al rol
CREATE POLICY "Service role can manage all customer mappings"
ON public.onvopay_customers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================
-- onvopay_payments
-- =====================
DROP POLICY IF EXISTS "Admins can view all payments" ON public.onvopay_payments;
DROP POLICY IF EXISTS "Clients can view their payments" ON public.onvopay_payments;
DROP POLICY IF EXISTS "Providers can view their payments" ON public.onvopay_payments;
DROP POLICY IF EXISTS "Service role can manage all payments" ON public.onvopay_payments;

-- Política unificada para SELECT y limitada a authenticated
CREATE POLICY "Unified: Users can view their payments"
ON public.onvopay_payments
FOR SELECT
TO authenticated
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR (select auth.uid()) = client_id
  OR (select auth.uid()) = provider_id
);

-- Service role con control total, restringido al rol
CREATE POLICY "Service role can manage all payments"
ON public.onvopay_payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);