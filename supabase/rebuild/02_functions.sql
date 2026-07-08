-- ============================================================
-- REBUILD LIMPIO v1 — ETAPA 2: FUNCIONES VITALES
-- ============================================================
-- Solo las funciones que el v1 necesita. Quitadas todas las de pagos/onvopay/
-- facturas/email. handle_new_user reescrito (sin clients/providers/residencias).
-- generate_provider_time_slots_for_listing con timezone corregido a Costa Rica.

-- ---------- Genéricos ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- Roles / auth ----------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'provider' THEN 2 WHEN 'client' THEN 3 END
  LIMIT 1;
$$;

-- handle_new_user REESCRITO: crea solo public.users (sin clients/providers/residencias)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  user_role TEXT;
  user_auth_provider TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  user_auth_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  INSERT INTO public.users (id, name, email, role, phone, avatar_url, auth_provider, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.email,
    user_role,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    user_auth_provider,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.users.name),
    email = COALESCE(EXCLUDED.email, public.users.email),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    auth_provider = EXCLUDED.auth_provider;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.role != NEW.role AND auth.uid() = NEW.id THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.toggle_user_active(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admins pueden cambiar estado de usuarios';
  END IF;
  UPDATE public.users SET is_active = NOT is_active WHERE id = _user_id;
END; $$;

-- ---------- Citas: nombres, slots, validaciones ----------
CREATE OR REPLACE FUNCTION public.set_appointment_names()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  -- No pisar el nombre del cliente invitado (booking link, client_id NULL)
  IF NEW.client_id IS NOT NULL THEN
    SELECT name INTO NEW.client_name FROM users WHERE id = NEW.client_id;
  END IF;
  SELECT name INTO NEW.provider_name FROM users WHERE id = NEW.provider_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_slot_as_reserved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE provider_time_slots SET is_reserved = true, is_available = false
  WHERE provider_id = NEW.provider_id AND listing_id = NEW.listing_id
    AND slot_datetime_start >= NEW.start_time AND slot_datetime_start < NEW.end_time;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.release_slot_on_cancellation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('cancelled','rejected') AND OLD.status NOT IN ('cancelled','rejected') THEN
    UPDATE provider_time_slots SET is_reserved = false, is_available = true
    WHERE provider_id = NEW.provider_id AND listing_id = NEW.listing_id
      AND slot_datetime_start >= NEW.start_time AND slot_datetime_start < NEW.end_time
      AND slot_type IN ('reserved','generated');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_appointment_completion()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.end_time > NOW() THEN
    RAISE EXCEPTION 'Cannot mark future appointments as completed. Ends at: %, Now: %', NEW.end_time, NOW();
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_slot_insertion()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM provider_time_slots
             WHERE provider_id = NEW.provider_id AND listing_id = NEW.listing_id
               AND slot_datetime_start = NEW.slot_datetime_start AND id != NEW.id) THEN
    RAISE EXCEPTION 'Duplicate slot detected';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_past_appointments_completed()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE updated_count INTEGER := 0;
BEGIN
  UPDATE appointments SET status = 'completed'
  WHERE status = 'confirmed' AND end_time < (NOW() - INTERVAL '1 hour');
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END; $$;

CREATE OR REPLACE FUNCTION public.toggle_slot_availability(p_slot_id uuid, p_is_available boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE provider_time_slots SET is_available = p_is_available, is_reserved = NOT p_is_available,
    slot_type = CASE WHEN p_is_available = false THEN 'manually_blocked' ELSE 'generated' END
  WHERE id = p_slot_id;
  RETURN FOUND;
END; $$;

-- ---------- Generación de slots (timezone CR) ----------
CREATE OR REPLACE FUNCTION public.generate_provider_time_slots_for_listing(p_provider_id uuid, p_listing_id uuid, p_days_ahead integer DEFAULT 60)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_timezone text := 'America/Costa_Rica';  -- FIX: era America/Mexico_City
  v_slot_size integer := 30;
  v_provider_avail RECORD;
  v_current_date date;
  v_end_date date;
  v_day_of_week integer;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_window_end_tz timestamptz;
  v_slots_created integer := 0;
  v_window_start time;
  v_window_end time;
  v_local_start_time time;
  v_local_end_time time;
BEGIN
  v_current_date := CURRENT_DATE;
  v_end_date := v_current_date + p_days_ahead;
  WHILE v_current_date <= v_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::integer;
    FOR v_provider_avail IN
      SELECT start_time, end_time FROM provider_availability
      WHERE provider_id = p_provider_id AND day_of_week = v_day_of_week AND is_active = true
    LOOP
      v_window_start := v_provider_avail.start_time;
      v_window_end := v_provider_avail.end_time;
      v_slot_start := (v_current_date + v_window_start) AT TIME ZONE v_timezone;
      v_window_end_tz := (v_current_date + v_window_end) AT TIME ZONE v_timezone;
      WHILE (v_slot_start + (v_slot_size || ' minutes')::interval) <= v_window_end_tz LOOP
        v_slot_end := v_slot_start + (v_slot_size || ' minutes')::interval;
        IF v_slot_start > NOW() THEN
          v_local_start_time := (v_slot_start AT TIME ZONE v_timezone)::time;
          v_local_end_time := (v_slot_end AT TIME ZONE v_timezone)::time;
          INSERT INTO provider_time_slots (provider_id, listing_id, slot_date, start_time, end_time,
            slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type)
          VALUES (p_provider_id, p_listing_id, v_current_date, v_local_start_time, v_local_end_time,
            v_slot_start, v_slot_end, true, false, 'generated')
          ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
          v_slots_created := v_slots_created + 1;
        END IF;
        v_slot_start := v_slot_end;
      END LOOP;
    END LOOP;
    v_current_date := v_current_date + 1;
  END LOOP;
  RETURN v_slots_created;
END; $$;

CREATE OR REPLACE FUNCTION public.auto_generate_slots_for_new_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM generate_provider_time_slots_for_listing(NEW.provider_id, NEW.id);
  RETURN NEW;
END; $$;

-- NO-OP: slots no se regeneran automáticamente
CREATE OR REPLACE FUNCTION public.regenerate_slots_for_listing(p_listing_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN RETURN 0; END; $$;

CREATE OR REPLACE FUNCTION public.maintain_future_slots()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_listing RECORD;
BEGIN
  FOR v_listing IN SELECT l.id AS listing_id, l.provider_id FROM listings l WHERE l.is_active = true LOOP
    PERFORM generate_provider_time_slots_for_listing(v_listing.provider_id, v_listing.listing_id, 60);
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_provider_availability_from_listing(p_listing_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_provider_id uuid; v_availability jsonb; v_inserted integer := 0;
BEGIN
  SELECT provider_id, availability::jsonb INTO v_provider_id, v_availability FROM listings WHERE id = p_listing_id;
  IF v_provider_id IS NULL THEN RAISE EXCEPTION 'Listing % no existe', p_listing_id; END IF;
  IF v_availability IS NULL OR v_availability = '{}'::jsonb THEN
    DELETE FROM provider_availability WHERE provider_id = v_provider_id; RETURN 0;
  END IF;
  DELETE FROM provider_availability WHERE provider_id = v_provider_id;
  WITH days(day_name, day_of_week) AS (VALUES ('sunday',0),('monday',1),('tuesday',2),('wednesday',3),('thursday',4),('friday',5),('saturday',6)),
  enabled_days AS (
    SELECT d.day_of_week,
      COALESCE((v_availability->d.day_name->>'enabled')::boolean, false) AS enabled,
      COALESCE((v_availability->d.day_name->'timeSlots')::jsonb, '[]'::jsonb) AS slots
    FROM days d)
  INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_active)
  SELECT v_provider_id, ed.day_of_week, (slot->>'startTime')::time, (slot->>'endTime')::time, true
  FROM enabled_days ed CROSS JOIN LATERAL jsonb_array_elements(ed.slots) AS slot
  WHERE ed.enabled = true;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END; $$;

CREATE OR REPLACE FUNCTION public.on_listings_update_sync_and_regen()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_synced integer;
BEGIN
  IF (OLD.availability IS DISTINCT FROM NEW.availability)
     OR (OLD.standard_duration IS DISTINCT FROM NEW.standard_duration)
     OR (OLD.duration IS DISTINCT FROM NEW.duration) THEN
    BEGIN SELECT sync_provider_availability_from_listing(NEW.id) INTO v_synced;
    EXCEPTION WHEN OTHERS THEN RAISE LOG 'sync error listing %: %', NEW.id, SQLERRM; END;
  END IF;
  RETURN NEW;
END; $$;

-- ---------- Recurrencia ----------
CREATE OR REPLACE FUNCTION public.calculate_next_occurrence_sql(original_date date, recurrence_type text, reference_date date)
RETURNS date LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE target_dow INTEGER; next_date DATE; days_until_target INTEGER; weeks_diff INTEGER;
BEGIN
  target_dow := EXTRACT(DOW FROM original_date)::INTEGER;
  CASE recurrence_type
    WHEN 'weekly' THEN
      days_until_target := (target_dow - EXTRACT(DOW FROM reference_date)::INTEGER + 7) % 7;
      IF days_until_target = 0 THEN days_until_target := 7; END IF;
      RETURN reference_date + days_until_target;
    WHEN 'biweekly' THEN
      days_until_target := (target_dow - EXTRACT(DOW FROM reference_date)::INTEGER + 7) % 7;
      IF days_until_target = 0 THEN days_until_target := 7; END IF;
      next_date := reference_date + days_until_target;
      weeks_diff := ((next_date - original_date) / 7)::INTEGER;
      IF weeks_diff % 2 != 0 THEN next_date := next_date + 7; END IF;
      RETURN next_date;
    WHEN 'monthly' THEN
      next_date := (DATE_TRUNC('month', reference_date) + INTERVAL '1 month' + (EXTRACT(DAY FROM original_date) - 1) * INTERVAL '1 day')::DATE;
      IF EXTRACT(DAY FROM reference_date) < EXTRACT(DAY FROM original_date) THEN
        next_date := (DATE_TRUNC('month', reference_date) + (EXTRACT(DAY FROM original_date) - 1) * INTERVAL '1 day')::DATE;
      END IF;
      RETURN next_date;
    ELSE RETURN reference_date;
  END CASE;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_recurring_appointment_instances(p_rule_id uuid, p_weeks_ahead integer DEFAULT 10)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  rule_record recurring_rules%ROWTYPE; start_date_calc DATE; end_date_calc DATE;
  next_occurrence DATE; instance_count INTEGER := 0; start_datetime timestamptz; end_datetime timestamptz; instances_created INTEGER := 0;
BEGIN
  SELECT * INTO rule_record FROM recurring_rules WHERE id = p_rule_id AND is_active = true;
  IF NOT FOUND THEN RETURN 0; END IF;
  start_date_calc := GREATEST(rule_record.start_date, CURRENT_DATE);
  end_date_calc := start_date_calc + (p_weeks_ahead * 7);
  next_occurrence := start_date_calc;
  WHILE next_occurrence <= end_date_calc AND instances_created < 50 LOOP
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN
        WHILE EXTRACT(DOW FROM next_occurrence)::INTEGER != rule_record.day_of_week LOOP next_occurrence := next_occurrence + 1; END LOOP;
      WHEN 'biweekly' THEN
        WHILE EXTRACT(DOW FROM next_occurrence)::INTEGER != rule_record.day_of_week
          OR EXTRACT(DAYS FROM next_occurrence - rule_record.start_date)::INTEGER % 14 != 0 LOOP
          next_occurrence := next_occurrence + 1; IF next_occurrence > end_date_calc THEN EXIT; END IF;
        END LOOP;
      WHEN 'monthly' THEN
        WHILE EXTRACT(DAY FROM next_occurrence)::INTEGER != rule_record.day_of_month LOOP
          next_occurrence := next_occurrence + 1; IF next_occurrence > end_date_calc THEN EXIT; END IF;
        END LOOP;
    END CASE;
    IF next_occurrence > end_date_calc THEN EXIT; END IF;
    start_datetime := (next_occurrence + rule_record.start_time) AT TIME ZONE 'America/Costa_Rica';
    end_datetime := (next_occurrence + rule_record.end_time) AT TIME ZONE 'America/Costa_Rica';
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE provider_id = rule_record.provider_id
        AND start_time < end_datetime AND end_time > start_datetime AND status NOT IN ('cancelled','rejected')) THEN
      INSERT INTO recurring_appointment_instances (recurring_rule_id, instance_date, start_time, end_time, status, notes)
      VALUES (p_rule_id, next_occurrence, start_datetime, end_datetime, 'scheduled', rule_record.notes)
      ON CONFLICT (recurring_rule_id, instance_date) DO NOTHING;
      GET DIAGNOSTICS instance_count = ROW_COUNT;
      IF instance_count > 0 THEN instances_created := instances_created + 1; END IF;
    END IF;
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN next_occurrence := next_occurrence + 7;
      WHEN 'biweekly' THEN next_occurrence := next_occurrence + 14;
      WHEN 'monthly' THEN next_occurrence := next_occurrence + 30;
    END CASE;
  END LOOP;
  RETURN instances_created;
END; $$;

CREATE OR REPLACE FUNCTION public.auto_generate_recurring_instances()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_active = true AND NEW.recurrence_type IN ('weekly','biweekly','monthly') THEN
    PERFORM generate_recurring_appointment_instances(NEW.id, 12);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.block_recurring_slots_for_appointment(p_appointment_id uuid, p_months_ahead integer DEFAULT 12)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE appt appointments%ROWTYPE; slots_blocked INTEGER := 0; iter_date DATE; end_date DATE;
  service_duration INTEGER; recurrence_interval INTEGER; slot_start timestamptz; slot_end timestamptz;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id AND recurrence IS NOT NULL AND recurrence != 'none';
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT standard_duration INTO service_duration FROM listings WHERE id = appt.listing_id;
  IF service_duration IS NULL THEN RETURN 0; END IF;
  iter_date := calculate_next_occurrence_sql(appt.start_time::date, appt.recurrence, CURRENT_DATE);
  end_date := CURRENT_DATE + (p_months_ahead * 30);
  recurrence_interval := CASE appt.recurrence WHEN 'weekly' THEN 7 WHEN 'biweekly' THEN 14 WHEN 'triweekly' THEN 21 WHEN 'monthly' THEN 30 ELSE 7 END;
  WHILE iter_date <= end_date AND slots_blocked < 365 LOOP
    slot_start := iter_date + appt.start_time::time;
    slot_end := slot_start + (service_duration || ' minutes')::interval;
    INSERT INTO provider_time_slots (provider_id, listing_id, slot_date, start_time, end_time,
      slot_datetime_start, slot_datetime_end, is_available, is_reserved, recurring_blocked, blocked_until)
    VALUES (appt.provider_id, appt.listing_id, iter_date, appt.start_time::time, slot_end::time,
      slot_start, slot_end, false, true, true, end_date)
    ON CONFLICT (provider_id, listing_id, slot_datetime_start)
    DO UPDATE SET is_available=false, is_reserved=true, recurring_blocked=true, blocked_until=end_date;
    slots_blocked := slots_blocked + 1;
    iter_date := iter_date + recurrence_interval;
  END LOOP;
  RETURN slots_blocked;
END; $$;

CREATE OR REPLACE FUNCTION public.unblock_recurring_slots_for_appointment(p_appointment_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE appt appointments%ROWTYPE; slots_unblocked INTEGER;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  UPDATE provider_time_slots SET is_available=true, is_reserved=false, recurring_blocked=false, blocked_until=NULL
  WHERE provider_id = appt.provider_id AND listing_id = appt.listing_id
    AND recurring_blocked = true AND start_time = appt.start_time::time AND slot_date > appt.start_time::date;
  GET DIAGNOSTICS slots_unblocked = ROW_COUNT;
  RETURN slots_unblocked;
END; $$;

CREATE OR REPLACE FUNCTION public.manage_recurring_appointment_slots()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE slots_affected integer := 0;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none' THEN
    BEGIN SELECT block_recurring_slots_for_appointment(NEW.id, 12) INTO slots_affected;
    EXCEPTION WHEN OTHERS THEN RAISE LOG 'block error %: %', NEW.id, SQLERRM; END;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('cancelled','rejected') AND OLD.status NOT IN ('cancelled','rejected')
       AND OLD.recurrence IS NOT NULL AND OLD.recurrence != 'none' THEN
      BEGIN SELECT unblock_recurring_slots_for_appointment(NEW.id) INTO slots_affected;
      EXCEPTION WHEN OTHERS THEN RAISE LOG 'unblock error %: %', NEW.id, SQLERRM; END;
    END IF;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.create_recurring_rule_from_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE day_of_week_val INTEGER; day_of_month_val INTEGER; rule_id UUID; real_client_name TEXT;
  existing_rule_id UUID; local_start_time TIME; local_end_time TIME; local_date DATE;
BEGIN
  IF NEW.recurrence IN ('weekly','biweekly','monthly') AND NEW.status = 'confirmed'
     AND (NEW.is_recurring_instance = false OR NEW.is_recurring_instance IS NULL) AND NEW.recurring_rule_id IS NULL THEN
    local_start_time := (NEW.start_time AT TIME ZONE 'America/Costa_Rica')::TIME;
    local_end_time := (NEW.end_time AT TIME ZONE 'America/Costa_Rica')::TIME;
    local_date := (NEW.start_time AT TIME ZONE 'America/Costa_Rica')::DATE;
    SELECT name INTO real_client_name FROM users WHERE id = NEW.client_id;
    SELECT id INTO existing_rule_id FROM recurring_rules
      WHERE client_id = NEW.client_id AND provider_id = NEW.provider_id AND listing_id = NEW.listing_id
        AND recurrence_type = NEW.recurrence AND start_time = local_start_time AND end_time = local_end_time
        AND is_active = true AND start_date <= local_date;
    IF existing_rule_id IS NULL THEN
      day_of_week_val := EXTRACT(DOW FROM local_date)::INTEGER;
      day_of_month_val := EXTRACT(DAY FROM local_date)::INTEGER;
      INSERT INTO recurring_rules (client_id, provider_id, listing_id, recurrence_type, start_date, start_time, end_time,
        day_of_week, day_of_month, is_active, client_name, notes, client_address, client_phone, client_email)
      VALUES (NEW.client_id, NEW.provider_id, NEW.listing_id, NEW.recurrence, local_date, local_start_time, local_end_time,
        CASE WHEN NEW.recurrence IN ('weekly','biweekly') THEN day_of_week_val ELSE NULL END,
        CASE WHEN NEW.recurrence = 'monthly' THEN day_of_month_val ELSE NULL END,
        true, COALESCE(real_client_name, NEW.client_name), NEW.notes, NEW.client_address, NEW.client_phone, NEW.client_email)
      RETURNING id INTO rule_id;
      UPDATE appointments SET recurring_rule_id = rule_id WHERE id = NEW.id;
    ELSE
      UPDATE appointments SET recurring_rule_id = existing_rule_id WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'create_recurring_rule error: %', SQLERRM; RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.advance_recurring_appointment(p_appointment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user_id UUID; appt appointments%ROWTYPE; interval_rec INTERVAL; next_start timestamptz; next_end timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  IF v_user_id != appt.client_id AND v_user_id != appt.provider_id THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF appt.recurrence IS NULL OR appt.recurrence IN ('none','once','') THEN RAISE EXCEPTION 'Invalid recurrence'; END IF;
  CASE appt.recurrence
    WHEN 'daily' THEN interval_rec := INTERVAL '1 day';
    WHEN 'weekly' THEN interval_rec := INTERVAL '1 week';
    WHEN 'biweekly' THEN interval_rec := INTERVAL '2 weeks';
    WHEN 'triweekly' THEN interval_rec := INTERVAL '3 weeks';
    WHEN 'monthly' THEN interval_rec := INTERVAL '1 month';
    ELSE RAISE EXCEPTION 'Invalid recurrence'; END CASE;
  next_start := appt.start_time + interval_rec; next_end := appt.end_time + interval_rec;
  WHILE next_start <= now() LOOP next_start := next_start + interval_rec; next_end := next_end + interval_rec; END LOOP;
  INSERT INTO appointments (listing_id, client_id, provider_id, start_time, end_time, status, notes,
    client_address, client_phone, client_email, client_name, provider_name, recurrence, recurrence_group_id,
    external_booking, is_recurring_instance, created_at, created_from, created_by_user)
  VALUES (appt.listing_id, appt.client_id, appt.provider_id, next_start, next_end, 'confirmed', appt.notes,
    appt.client_address, appt.client_phone, appt.client_email, appt.client_name, appt.provider_name, appt.recurrence,
    appt.recurrence_group_id, appt.external_booking, true, now(), 'auto_advanced', appt.client_id);
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_appointment_atomic(p_appointment_id uuid, p_cancel_future boolean DEFAULT false, p_reason text DEFAULT 'user_cancelled', p_cancelled_by uuid DEFAULT NULL)
RETURNS TABLE(affected_count integer, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_appointment appointments%ROWTYPE; v_affected_count INTEGER := 0; v_instance_count INTEGER := 0;
BEGIN
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found: %', p_appointment_id; END IF;
  IF p_cancelled_by IS NOT NULL AND p_cancelled_by != v_appointment.client_id AND p_cancelled_by != v_appointment.provider_id THEN
    RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE appointments SET status='cancelled', cancellation_reason=p_reason, cancellation_time=NOW(),
    last_modified_at=NOW(), last_modified_by=COALESCE(p_cancelled_by, auth.uid()) WHERE id = p_appointment_id;
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  IF p_cancel_future AND v_appointment.recurrence IS NOT NULL AND v_appointment.recurrence != 'none' THEN
    UPDATE recurring_appointment_instances SET status='cancelled', notes=COALESCE(notes || ' ','') || '[CANCELLED WITH PARENT]'
    WHERE recurring_rule_id IN (SELECT id FROM recurring_rules WHERE provider_id=v_appointment.provider_id
        AND client_id=v_appointment.client_id AND listing_id=v_appointment.listing_id)
      AND instance_date > CURRENT_DATE AND status NOT IN ('cancelled','completed');
    GET DIAGNOSTICS v_instance_count = ROW_COUNT;
    v_affected_count := v_affected_count + v_instance_count;
    PERFORM unblock_recurring_slots_for_appointment(p_appointment_id);
  END IF;
  UPDATE provider_time_slots SET is_available=true, is_reserved=false, recurring_blocked=false
  WHERE provider_id=v_appointment.provider_id AND listing_id=v_appointment.listing_id
    AND slot_datetime_start >= v_appointment.start_time
    AND (slot_datetime_start = v_appointment.start_time OR (p_cancel_future AND recurring_blocked = true));
  RETURN QUERY SELECT v_affected_count, format('Cancelled %s appointment(s)', v_affected_count);
END; $$;

-- ---------- Ratings ----------
CREATE OR REPLACE FUNCTION public.submit_provider_rating(p_provider_id uuid, p_client_id uuid, p_appointment_id uuid, p_rating integer, p_comment text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO provider_ratings (provider_id, client_id, appointment_id, rating, comment, created_at)
  VALUES (p_provider_id, p_client_id, p_appointment_id, p_rating, p_comment, NOW())
  ON CONFLICT (appointment_id) DO UPDATE SET rating=p_rating, comment=p_comment, created_at=NOW();
  WITH provider_avg AS (SELECT (5.0 + SUM(rating::numeric)) / (COUNT(*) + 1) AS avg_rating FROM provider_ratings WHERE provider_id=p_provider_id)
  UPDATE users SET average_rating = ROUND(provider_avg.avg_rating, 1) FROM provider_avg WHERE users.id = p_provider_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_recurring_clients_count(provider_id uuid)
RETURNS integer LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RETURN (SELECT COUNT(DISTINCT appointments.client_id) FROM appointments
    WHERE appointments.provider_id = $1 AND appointments.client_id IS NOT NULL
      AND appointments.recurrence IN ('weekly','biweekly','monthly') AND appointments.status IN ('confirmed','completed'));
END; $$;

CREATE OR REPLACE FUNCTION public.get_provider_achievements_data(p_provider_id uuid)
RETURNS TABLE(completed_jobs_count integer, recurring_clients_count integer, average_rating numeric, total_ratings integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM mark_past_appointments_completed();
  RETURN QUERY
  WITH appointment_stats AS (
    SELECT COUNT(*) FILTER (WHERE a.status='completed') AS completed_count,
      COUNT(DISTINCT a.client_id) FILTER (WHERE a.recurrence IN ('weekly','biweekly','monthly') AND a.status IN ('confirmed','completed')) AS recurring_count
    FROM appointments a WHERE a.provider_id = p_provider_id),
  rating_stats AS (
    SELECT AVG(pr.rating)::numeric AS avg_rating, COUNT(pr.rating) AS rating_count
    FROM provider_ratings pr JOIN appointments a ON pr.appointment_id = a.id
    WHERE pr.provider_id = p_provider_id AND a.status='completed')
  SELECT COALESCE(appointment_stats.completed_count::integer,0), COALESCE(appointment_stats.recurring_count::integer,0),
    COALESCE(rating_stats.avg_rating, 5.0), COALESCE(rating_stats.rating_count::integer,0)
  FROM appointment_stats CROSS JOIN rating_stats;
END; $$;

-- ---------- Helpers de lectura (SQL) ----------
CREATE OR REPLACE FUNCTION public.get_provider_by_name(p_name text)
RETURNS TABLE(id uuid, name text, email text, phone text, avatar_url text, about_me text, average_rating numeric, experience_years integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.about_me, u.average_rating, u.experience_years
  FROM public.users u WHERE u.role='provider' AND lower(trim(u.name)) = lower(trim(p_name)) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_provider_day_busy(p_provider_id uuid, p_date date)
RETURNS TABLE(start_time timestamptz, end_time timestamptz, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a.start_time, a.end_time, 'appointment'::text FROM public.appointments a
  WHERE a.provider_id = p_provider_id AND a.status <> 'cancelled' AND a.start_time::date = p_date
  UNION ALL
  SELECT (b.slot_date + b.slot_time)::timestamptz, (b.slot_date + b.slot_time + interval '30 minutes')::timestamptz, 'blocked'::text
  FROM public.blocked_slots b WHERE b.provider_id = p_provider_id AND b.slot_date = p_date;
$$;

CREATE OR REPLACE FUNCTION public.get_provider_listing(p_provider_id uuid)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE listing_id UUID;
BEGIN SELECT id INTO listing_id FROM listings WHERE provider_id = p_provider_id AND is_active = true LIMIT 1; RETURN listing_id; END; $$;

CREATE OR REPLACE FUNCTION public.needs_price_finalization(appointment_row appointments)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT appointment_row.status='completed' AND (appointment_row.final_price IS NULL OR appointment_row.price_finalized = FALSE)
    AND EXISTS (SELECT 1 FROM listings WHERE listings.id = appointment_row.listing_id
      AND (listings.is_post_payment = TRUE OR listings.service_variants::text LIKE '%"ambas"%'));
$$;

CREATE OR REPLACE FUNCTION public.update_recurring_exceptions_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
