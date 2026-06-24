-- ============================================================
-- REBUILD LIMPIO v1 — ETAPA 4: TRIGGERS
-- ============================================================
-- Solo triggers cuyas funciones y tablas conservamos. Quitados: facturas, onvopay,
-- email, prevent_role_updates (bloqueaba todo update de rol), duplicados.

-- Crear public.users al registrarse en auth (en Supabase auth.users existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Appointments
CREATE TRIGGER set_appointment_names_trigger
  BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION set_appointment_names();

CREATE TRIGGER trigger_mark_slot_reserved
  AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION mark_slot_as_reserved();

CREATE TRIGGER trigger_release_slot_on_cancellation
  AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION release_slot_on_cancellation();

CREATE TRIGGER trg_manage_recurring_appointment_slots_ins
  AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION manage_recurring_appointment_slots();

CREATE TRIGGER trg_manage_recurring_appointment_slots_upd
  AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION manage_recurring_appointment_slots();

CREATE TRIGGER trigger_create_recurring_rule
  AFTER UPDATE ON public.appointments FOR EACH ROW
  WHEN (new.status = 'confirmed'::text AND old.status = 'pending'::text)
  EXECUTE FUNCTION create_recurring_rule_from_appointment();

CREATE TRIGGER validate_appointment_status
  BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION validate_appointment_completion();

-- Users
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- Listings
CREATE TRIGGER trigger_auto_generate_slots
  AFTER INSERT ON public.listings FOR EACH ROW EXECUTE FUNCTION auto_generate_slots_for_new_listing();

CREATE TRIGGER trigger_listings_sync_availability
  AFTER UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION on_listings_update_sync_and_regen();

-- Recurring rules
CREATE TRIGGER trigger_auto_generate_recurring_instances
  AFTER INSERT OR UPDATE ON public.recurring_rules FOR EACH ROW EXECUTE FUNCTION auto_generate_recurring_instances();

-- Slots: NO se agrega validate_slot_insertion como trigger — la UNIQUE constraint
-- (provider_id, listing_id, slot_datetime_start) ya evita duplicados, y el trigger
-- rompía los upserts legítimos (INSERT ... ON CONFLICT) al reservar slots.

-- Recurring exceptions
CREATE TRIGGER update_recurring_exceptions_updated_at
  BEFORE UPDATE ON public.recurring_exceptions FOR EACH ROW EXECUTE FUNCTION update_recurring_exceptions_updated_at();

-- updated_at genéricos en tablas con esa columna
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_availability_updated_at
  BEFORE UPDATE ON public.provider_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recurring_rules_updated_at
  BEFORE UPDATE ON public.recurring_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
