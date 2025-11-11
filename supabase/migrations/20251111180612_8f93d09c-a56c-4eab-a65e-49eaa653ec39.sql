-- ============================================
-- Optimize RLS policies: Replace auth.uid() with (select auth.uid())
-- This prevents unnecessary re-evaluation for each row
-- ============================================

-- user_roles table
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING ((select auth.uid()) = user_id);

-- appointments table
DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;
CREATE POLICY "Admins can update all appointments" 
ON public.appointments 
FOR UPDATE 
USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
CREATE POLICY "Admins can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Clients can create appointment requests" ON public.appointments;
CREATE POLICY "Clients can create appointment requests" 
ON public.appointments 
FOR INSERT 
WITH CHECK ((select auth.uid()) = client_id AND status = 'pending' AND created_by_user = client_id);

DROP POLICY IF EXISTS "Clients can delete their cancelled appointments" ON public.appointments;
CREATE POLICY "Clients can delete their cancelled appointments" 
ON public.appointments 
FOR DELETE 
USING ((select auth.uid()) = client_id AND status = 'cancelled');

DROP POLICY IF EXISTS "Clients can update their own appointments" ON public.appointments;
CREATE POLICY "Clients can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING ((select auth.uid()) = client_id)
WITH CHECK ((select auth.uid()) = client_id);

DROP POLICY IF EXISTS "Clients can view their appointments" ON public.appointments;
CREATE POLICY "Clients can view their appointments" 
ON public.appointments 
FOR SELECT 
USING ((select auth.uid()) = client_id);

DROP POLICY IF EXISTS "Providers can update appointments they own" ON public.appointments;
CREATE POLICY "Providers can update appointments they own" 
ON public.appointments 
FOR UPDATE 
USING ((select auth.uid()) = provider_id)
WITH CHECK ((select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can view their appointments" ON public.appointments;
CREATE POLICY "Providers can view their appointments" 
ON public.appointments 
FOR SELECT 
USING ((select auth.uid()) = provider_id);

-- users table
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users" 
ON public.users 
FOR UPDATE 
USING (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view basic user data" ON public.users;
CREATE POLICY "Authenticated users can view basic user data" 
ON public.users 
FOR SELECT 
USING ((select auth.role()) = 'authenticated' AND (role = 'provider' OR role = 'client'));

DROP POLICY IF EXISTS "Authenticated users can view provider public data" ON public.users;
CREATE POLICY "Authenticated users can view provider public data" 
ON public.users 
FOR SELECT 
USING ((select auth.role()) = 'authenticated' AND role = 'provider');

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING ((select auth.uid()) = id);

-- onvopay_payments table
DROP POLICY IF EXISTS "Admins can view all payments" ON public.onvopay_payments;
CREATE POLICY "Admins can view all payments" 
ON public.onvopay_payments 
FOR SELECT 
USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Clients can view their payments" ON public.onvopay_payments;
CREATE POLICY "Clients can view their payments" 
ON public.onvopay_payments 
FOR SELECT 
USING ((select auth.uid()) = client_id);

DROP POLICY IF EXISTS "Providers can view their payments" ON public.onvopay_payments;
CREATE POLICY "Providers can view their payments" 
ON public.onvopay_payments 
FOR SELECT 
USING ((select auth.uid()) = provider_id);

-- provider_ratings table
DROP POLICY IF EXISTS "Clients can create ratings" ON public.provider_ratings;
CREATE POLICY "Clients can create ratings" 
ON public.provider_ratings 
FOR INSERT 
WITH CHECK ((select auth.uid()) = client_id);

DROP POLICY IF EXISTS "Clients can view their own ratings" ON public.provider_ratings;
CREATE POLICY "Clients can view their own ratings" 
ON public.provider_ratings 
FOR SELECT 
USING ((select auth.uid()) = client_id);

DROP POLICY IF EXISTS "Providers can view ratings about them" ON public.provider_ratings;
CREATE POLICY "Providers can view ratings about them" 
ON public.provider_ratings 
FOR SELECT 
USING ((select auth.uid()) = provider_id);

-- recurring_rules table
DROP POLICY IF EXISTS "Clients can create recurring rules" ON public.recurring_rules;
CREATE POLICY "Clients can create recurring rules" 
ON public.recurring_rules 
FOR INSERT 
WITH CHECK ((select auth.uid()) = client_id);

DROP POLICY IF EXISTS "Providers can manage their recurring rules" ON public.recurring_rules;
CREATE POLICY "Providers can manage their recurring rules" 
ON public.recurring_rules 
FOR ALL 
USING ((select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Users can view their own recurring rules" ON public.recurring_rules;
CREATE POLICY "Users can view their own recurring rules" 
ON public.recurring_rules 
FOR SELECT 
USING ((select auth.uid()) = provider_id OR (select auth.uid()) = client_id);

-- providers table
DROP POLICY IF EXISTS "Providers can view their own data" ON public.providers;
CREATE POLICY "Providers can view their own data" 
ON public.providers 
FOR ALL 
USING ((select auth.uid()) = id);

-- onvopay_subscriptions table
DROP POLICY IF EXISTS "Clients can update their subscriptions" ON public.onvopay_subscriptions;
CREATE POLICY "Clients can update their subscriptions" 
ON public.onvopay_subscriptions 
FOR UPDATE 
USING ((select auth.uid()) = client_id);

DROP POLICY IF EXISTS "Clients can view their subscriptions" ON public.onvopay_subscriptions;
CREATE POLICY "Clients can view their subscriptions" 
ON public.onvopay_subscriptions 
FOR SELECT 
USING ((select auth.uid()) = client_id);

DROP POLICY IF EXISTS "Providers can view their subscriptions" ON public.onvopay_subscriptions;
CREATE POLICY "Providers can view their subscriptions" 
ON public.onvopay_subscriptions 
FOR SELECT 
USING ((select auth.uid()) = provider_id);

-- post_payment_evidence table
DROP POLICY IF EXISTS "Clients can view evidence for their appointments" ON public.post_payment_evidence;
CREATE POLICY "Clients can view evidence for their appointments" 
ON public.post_payment_evidence 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM appointments 
  WHERE appointments.id = post_payment_evidence.appointment_id 
  AND appointments.client_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Providers can manage their post payment evidence" ON public.post_payment_evidence;
CREATE POLICY "Providers can manage their post payment evidence" 
ON public.post_payment_evidence 
FOR ALL 
USING ((select auth.uid()) = provider_id)
WITH CHECK ((select auth.uid()) = provider_id);

-- post_payment_items table
DROP POLICY IF EXISTS "Clients can view items for their invoices" ON public.post_payment_items;
CREATE POLICY "Clients can view items for their invoices" 
ON public.post_payment_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM post_payment_invoices 
  WHERE post_payment_invoices.id = post_payment_items.invoice_id 
  AND post_payment_invoices.client_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Providers can manage items for their invoices" ON public.post_payment_items;
CREATE POLICY "Providers can manage items for their invoices" 
ON public.post_payment_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM post_payment_invoices 
  WHERE post_payment_invoices.id = post_payment_items.invoice_id 
  AND post_payment_invoices.provider_id = (select auth.uid())
));

-- team_members table
DROP POLICY IF EXISTS "Clients can view team members of their service providers" ON public.team_members;
CREATE POLICY "Clients can view team members of their service providers" 
ON public.team_members 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM appointments 
  WHERE appointments.provider_id = team_members.provider_id 
  AND appointments.client_id = (select auth.uid()) 
  AND appointments.status IN ('pending', 'confirmed')
));

DROP POLICY IF EXISTS "Providers can delete their team members" ON public.team_members;
CREATE POLICY "Providers can delete their team members" 
ON public.team_members 
FOR DELETE 
USING ((select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can insert their team members" ON public.team_members;
CREATE POLICY "Providers can insert their team members" 
ON public.team_members 
FOR INSERT 
WITH CHECK ((select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can update their team members" ON public.team_members;
CREATE POLICY "Providers can update their team members" 
ON public.team_members 
FOR UPDATE 
USING ((select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can view their team members" ON public.team_members;
CREATE POLICY "Providers can view their team members" 
ON public.team_members 
FOR SELECT 
USING ((select auth.uid()) = provider_id);

-- onvopay_customers table
DROP POLICY IF EXISTS "Clients can view their own customer mappings" ON public.onvopay_customers;
CREATE POLICY "Clients can view their own customer mappings" 
ON public.onvopay_customers 
FOR SELECT 
USING ((select auth.uid()) = client_id);

-- clients table
DROP POLICY IF EXISTS "Clients can view their own data" ON public.clients;
CREATE POLICY "Clients can view their own data" 
ON public.clients 
FOR ALL 
USING ((select auth.uid()) = id);

-- invoices table
DROP POLICY IF EXISTS "Clients can view their own invoices" ON public.invoices;
CREATE POLICY "Clients can view their own invoices" 
ON public.invoices 
FOR SELECT 
USING ((select auth.uid()) = client_id);

DROP POLICY IF EXISTS "Providers can view their invoices" ON public.invoices;
CREATE POLICY "Providers can view their invoices" 
ON public.invoices 
FOR SELECT 
USING ((select auth.uid()) = provider_id);

-- recurring_appointment_instances table
DROP POLICY IF EXISTS "Clients can view their recurring instances" ON public.recurring_appointment_instances;
CREATE POLICY "Clients can view their recurring instances" 
ON public.recurring_appointment_instances 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM recurring_rules 
  WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id 
  AND recurring_rules.client_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Providers can manage their recurring instances" ON public.recurring_appointment_instances;
CREATE POLICY "Providers can manage their recurring instances" 
ON public.recurring_appointment_instances 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM recurring_rules 
  WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id 
  AND recurring_rules.provider_id = (select auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM recurring_rules 
  WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id 
  AND recurring_rules.provider_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Providers can view their recurring instances" ON public.recurring_appointment_instances;
CREATE POLICY "Providers can view their recurring instances" 
ON public.recurring_appointment_instances 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM recurring_rules 
  WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id 
  AND recurring_rules.provider_id = (select auth.uid())
));

-- listing_residencias table
DROP POLICY IF EXISTS "Proveedores pueden actualizar sus listing_residencias" ON public.listing_residencias;
CREATE POLICY "Proveedores pueden actualizar sus listing_residencias" 
ON public.listing_residencias 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM listings 
  WHERE listings.id = listing_residencias.listing_id 
  AND listings.provider_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Proveedores pueden eliminar sus listing_residencias" ON public.listing_residencias;
CREATE POLICY "Proveedores pueden eliminar sus listing_residencias" 
ON public.listing_residencias 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM listings 
  WHERE listings.id = listing_residencias.listing_id 
  AND listings.provider_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Proveedores pueden insertar listing_residencias" ON public.listing_residencias;
CREATE POLICY "Proveedores pueden insertar listing_residencias" 
ON public.listing_residencias 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM listings 
  WHERE listings.id = listing_residencias.listing_id 
  AND listings.provider_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Proveedores pueden ver sus listing_residencias" ON public.listing_residencias;
CREATE POLICY "Proveedores pueden ver sus listing_residencias" 
ON public.listing_residencias 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM listings 
  WHERE listings.id = listing_residencias.listing_id 
  AND listings.provider_id = (select auth.uid())
));

-- listings table
DROP POLICY IF EXISTS "Providers can create their own listings" ON public.listings;
CREATE POLICY "Providers can create their own listings" 
ON public.listings 
FOR INSERT 
WITH CHECK ((select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can delete their own listings" ON public.listings;
CREATE POLICY "Providers can delete their own listings" 
ON public.listings 
FOR DELETE 
USING ((select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can update their own listings" ON public.listings;
CREATE POLICY "Providers can update their own listings" 
ON public.listings 
FOR UPDATE 
USING ((select auth.uid()) = provider_id);

-- price_history table
DROP POLICY IF EXISTS "Providers can insert their price history" ON public.price_history;
CREATE POLICY "Providers can insert their price history" 
ON public.price_history 
FOR INSERT 
WITH CHECK ((select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can view their price history" ON public.price_history;
CREATE POLICY "Providers can view their price history" 
ON public.price_history 
FOR SELECT 
USING ((select auth.uid()) = provider_id);

-- provider_residencias table
DROP POLICY IF EXISTS "Providers can insert their residencias" ON public.provider_residencias;
CREATE POLICY "Providers can insert their residencias" 
ON public.provider_residencias 
FOR INSERT 
WITH CHECK ((select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can view their residencias" ON public.provider_residencias;
CREATE POLICY "Providers can view their residencias" 
ON public.provider_residencias 
FOR SELECT 
USING ((select auth.uid()) = provider_id);

-- provider_availability table
DROP POLICY IF EXISTS "Providers can manage their availability" ON public.provider_availability;
CREATE POLICY "Providers can manage their availability" 
ON public.provider_availability 
FOR ALL 
USING ((select auth.uid()) = provider_id)
WITH CHECK ((select auth.uid()) = provider_id);

-- payment_methods table
DROP POLICY IF EXISTS "Users can delete their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can delete their own payment methods" 
ON public.payment_methods 
FOR DELETE 
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can insert their own payment methods" 
ON public.payment_methods 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can update their own payment methods" 
ON public.payment_methods 
FOR UPDATE 
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can view their own payment methods" 
ON public.payment_methods 
FOR SELECT 
USING ((select auth.uid()) = user_id);

-- provider_slot_preferences table
DROP POLICY IF EXISTS "Providers can manage their slot preferences" ON public.provider_slot_preferences;
CREATE POLICY "Providers can manage their slot preferences" 
ON public.provider_slot_preferences 
FOR ALL 
USING ((select auth.uid()) = provider_id)
WITH CHECK ((select auth.uid()) = provider_id);

-- provider_time_slots table
DROP POLICY IF EXISTS "Providers can view their slots" ON public.provider_time_slots;
CREATE POLICY "Providers can view their slots" 
ON public.provider_time_slots 
FOR SELECT 
USING ((select auth.uid()) = provider_id);