-- ============================================================
-- REBUILD LIMPIO v1 — ETAPA 5: RLS (nueva, simple)
-- ============================================================
-- Lectura pública donde el booking link/directorio la necesita; escritura del dueño.
-- Las RPC SECURITY DEFINER (crear cita, etc.) operan por encima de RLS.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_appointment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_ratings ENABLE ROW LEVEL SECURITY;

-- Catálogos: lectura pública
CREATE POLICY "cat lectura" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "tipos lectura" ON public.service_types FOR SELECT USING (true);

-- Users: lectura pública (directorio/booking muestran nombre/foto); update propio
CREATE POLICY "users lectura" ON public.users FOR SELECT USING (true);
CREATE POLICY "users update propio" ON public.users FOR UPDATE USING (auth.uid() = id);

-- user_roles: el dueño lee; admin gestiona
CREATE POLICY "roles lee propio" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "roles admin gestiona" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Listings: lectura pública; el proveedor gestiona el suyo
CREATE POLICY "listings lectura" ON public.listings FOR SELECT USING (true);
CREATE POLICY "listings dueño insert" ON public.listings FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "listings dueño update" ON public.listings FOR UPDATE USING (auth.uid() = provider_id);
CREATE POLICY "listings dueño delete" ON public.listings FOR DELETE USING (auth.uid() = provider_id);

-- Disponibilidad y slots: lectura pública (para agendar); proveedor gestiona
CREATE POLICY "avail lectura" ON public.provider_availability FOR SELECT USING (true);
CREATE POLICY "avail dueño" ON public.provider_availability FOR ALL USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "slots lectura" ON public.provider_time_slots FOR SELECT USING (true);
CREATE POLICY "slots dueño" ON public.provider_time_slots FOR ALL USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "blocked dueño" ON public.blocked_slots FOR ALL USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

-- Citas: cliente y proveedor ven/gestionan las suyas
CREATE POLICY "citas ver propias" ON public.appointments FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id OR public.is_admin(auth.uid()));
CREATE POLICY "citas cliente crea" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = provider_id);
CREATE POLICY "citas update partes" ON public.appointments FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = provider_id OR public.is_admin(auth.uid()));

-- Recurrencia: partes involucradas
CREATE POLICY "rrules partes" ON public.recurring_rules FOR ALL
  USING (auth.uid() = client_id OR auth.uid() = provider_id) WITH CHECK (auth.uid() = client_id OR auth.uid() = provider_id);
CREATE POLICY "rinst lectura" ON public.recurring_appointment_instances FOR SELECT
  USING (EXISTS (SELECT 1 FROM recurring_rules rr WHERE rr.id = recurring_rule_id AND (rr.client_id = auth.uid() OR rr.provider_id = auth.uid())));
CREATE POLICY "rexc partes" ON public.recurring_exceptions FOR ALL
  USING (EXISTS (SELECT 1 FROM appointments a WHERE a.id = appointment_id AND (a.client_id = auth.uid() OR a.provider_id = auth.uid())))
  WITH CHECK (true);

-- Ratings: lectura pública; cliente crea
CREATE POLICY "ratings lectura" ON public.provider_ratings FOR SELECT USING (true);
CREATE POLICY "ratings cliente crea" ON public.provider_ratings FOR INSERT WITH CHECK (auth.uid() = client_id);
