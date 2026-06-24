-- Consolidación FINAL de todas las políticas RLS duplicadas restantes

-- =============================================
-- 1. recurring_instances: Consolidar SELECT (2 → 1) y separar ALL
-- =============================================
DROP POLICY IF EXISTS "Users can manage instances of their recurring rules" ON public.recurring_instances;
DROP POLICY IF EXISTS "Users can view instances of their recurring rules" ON public.recurring_instances;

-- SELECT unificado
CREATE POLICY "Unified: Users can view recurring instances"
ON public.recurring_instances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recurring_rules rr
    WHERE rr.id = recurring_instances.recurring_rule_id
      AND ((select auth.uid()) = rr.provider_id OR (select auth.uid()) = rr.client_id)
  )
);

-- INSERT, UPDATE, DELETE separados
CREATE POLICY "Users can insert recurring instances"
ON public.recurring_instances
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM recurring_rules rr
    WHERE rr.id = recurring_instances.recurring_rule_id
      AND ((select auth.uid()) = rr.provider_id OR (select auth.uid()) = rr.client_id)
  )
);

CREATE POLICY "Users can update recurring instances"
ON public.recurring_instances
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recurring_rules rr
    WHERE rr.id = recurring_instances.recurring_rule_id
      AND ((select auth.uid()) = rr.provider_id OR (select auth.uid()) = rr.client_id)
  )
);

CREATE POLICY "Users can delete recurring instances"
ON public.recurring_instances
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recurring_rules rr
    WHERE rr.id = recurring_instances.recurring_rule_id
      AND ((select auth.uid()) = rr.provider_id OR (select auth.uid()) = rr.client_id)
  )
);

-- =============================================
-- 2. recurring_rules: Consolidar SELECT (2 → 1) y separar ALL
-- =============================================
DROP POLICY IF EXISTS "Clients can create recurring rules" ON public.recurring_rules;
DROP POLICY IF EXISTS "Providers can manage their recurring rules" ON public.recurring_rules;
DROP POLICY IF EXISTS "Users can view their own recurring rules" ON public.recurring_rules;

-- SELECT unificado
CREATE POLICY "Unified: Users can view their recurring rules"
ON public.recurring_rules
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = provider_id
  OR
  (select auth.uid()) = client_id
);

-- INSERT unificado (clients y providers pueden crear)
CREATE POLICY "Unified: Users can create recurring rules"
ON public.recurring_rules
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) = client_id
  OR
  (select auth.uid()) = provider_id
);

-- UPDATE y DELETE solo providers
CREATE POLICY "Providers can update their recurring rules"
ON public.recurring_rules
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = provider_id)
WITH CHECK ((select auth.uid()) = provider_id);

CREATE POLICY "Providers can delete their recurring rules"
ON public.recurring_rules
FOR DELETE
TO authenticated
USING ((select auth.uid()) = provider_id);

-- =============================================
-- 3. service_categories: Eliminar duplicado
-- =============================================
DROP POLICY IF EXISTS "Allow public read access for categories" ON public.service_categories;
DROP POLICY IF EXISTS "Allow public read access to service categories" ON public.service_categories;

CREATE POLICY "Public can view service categories"
ON public.service_categories
FOR SELECT
TO public
USING (true);

-- =============================================
-- 4. service_types: Eliminar duplicado
-- =============================================
DROP POLICY IF EXISTS "Allow public read access to service types" ON public.service_types;
DROP POLICY IF EXISTS "Anyone can view service types" ON public.service_types;

CREATE POLICY "Public can view service types"
ON public.service_types
FOR SELECT
TO public
USING (true);

-- =============================================
-- 5. team_members: Consolidar SELECT (3 → 1)
-- =============================================
DROP POLICY IF EXISTS "Clients can view team members of their service providers" ON public.team_members;
DROP POLICY IF EXISTS "Providers can view their team members" ON public.team_members;
DROP POLICY IF EXISTS "Public can view team members" ON public.team_members;

-- SELECT público unificado
CREATE POLICY "Public can view all team members"
ON public.team_members
FOR SELECT
TO public
USING (true);

-- =============================================
-- 6. user_roles: Consolidar SELECT (3 → 1) y separar ALL
-- =============================================
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- SELECT unificado
CREATE POLICY "Unified: Users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR
  (select auth.uid()) = user_id
);

-- INSERT, UPDATE, DELETE solo admins
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role((select auth.uid()), 'admin'::app_role));

-- =============================================
-- 7. users: Consolidar SELECT (4 → 1) y UPDATE (2 → 1)
-- =============================================
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view basic user data" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view provider public data" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- SELECT unificado (admins ven todo, authenticated ven providers y su perfil)
CREATE POLICY "Unified: Users can view profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR
  (select auth.uid()) = id
  OR
  (role = 'provider' AND (role = 'provider' OR role = 'client'))
);

-- UPDATE unificado
CREATE POLICY "Unified: Users can update profiles"
ON public.users
FOR UPDATE
TO authenticated
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR
  (select auth.uid()) = id
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR
  (select auth.uid()) = id
);