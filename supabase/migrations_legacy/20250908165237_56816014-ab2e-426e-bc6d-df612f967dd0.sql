-- 1) Ensure triggers exist to manage recurring slot blocking on appointments
DROP TRIGGER IF EXISTS trg_manage_recurring_appointment_slots_ins ON public.appointments;
DROP TRIGGER IF EXISTS trg_manage_recurring_appointment_slots_upd ON public.appointments;

CREATE TRIGGER trg_manage_recurring_appointment_slots_ins
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.manage_recurring_appointment_slots();

CREATE TRIGGER trg_manage_recurring_appointment_slots_upd
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.manage_recurring_appointment_slots();

-- 2) Fix recurring advancement function: drop and recreate with a stable signature
DROP FUNCTION IF EXISTS public.advance_recurring_appointment(uuid);

CREATE FUNCTION public.advance_recurring_appointment(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  appt appointments%ROWTYPE;
  interval_rec INTERVAL;
  next_start TIMESTAMPTZ;
  next_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found' USING ERRCODE = 'P0001';
  END IF;

  -- Only advance valid recurring patterns
  IF appt.recurrence IS NULL OR appt.recurrence IN ('none','once','') THEN
    RAISE EXCEPTION 'Invalid recurrence pattern: %', COALESCE(appt.recurrence,'null') USING ERRCODE='P0001';
  END IF;

  CASE appt.recurrence
    WHEN 'weekly' THEN interval_rec := INTERVAL '1 week';
    WHEN 'biweekly' THEN interval_rec := INTERVAL '2 weeks';
    WHEN 'triweekly' THEN interval_rec := INTERVAL '3 weeks';
    WHEN 'monthly' THEN interval_rec := INTERVAL '1 month';
    ELSE RAISE EXCEPTION 'Invalid recurrence pattern: %', appt.recurrence USING ERRCODE='P0001';
  END CASE;

  next_start := appt.start_time + interval_rec;
  next_end := appt.end_time + interval_rec;

  -- Ensure we move to a future occurrence
  WHILE next_start <= now() LOOP
    next_start := next_start + interval_rec;
    next_end := next_end + interval_rec;
  END LOOP;

  -- Prevent conflicts with existing active appointments
  IF EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.provider_id = appt.provider_id
      AND a.status NOT IN ('cancelled','rejected')
      AND a.start_time < next_end
      AND a.end_time > next_start
  ) THEN
     RAISE EXCEPTION 'Next occurrence conflicts with existing appointment' USING ERRCODE='P0001';
  END IF;

  -- Create the next appointment instance
  INSERT INTO appointments (
    listing_id, client_id, provider_id, residencia_id,
    start_time, end_time, status, notes, client_address,
    client_phone, client_email, client_name, provider_name,
    recurrence, recurrence_group_id, external_booking, is_recurring_instance, created_at
  ) VALUES (
    appt.listing_id, appt.client_id, appt.provider_id, appt.residencia_id,
    next_start, next_end, 'confirmed', appt.notes, appt.client_address,
    appt.client_phone, appt.client_email, appt.client_name, appt.provider_name,
    appt.recurrence, appt.recurrence_group_id, appt.external_booking, true, now()
  );

  -- Block the time slot for provider calendar
  INSERT INTO provider_time_slots (
    provider_id, listing_id, slot_date, start_time, end_time,
    slot_datetime_start, slot_datetime_end, is_available, is_reserved, recurring_blocked, slot_type, created_at
  ) VALUES (
    appt.provider_id, appt.listing_id, next_start::date, next_start::time, next_end::time,
    next_start, next_end, false, true, true, 'reserved', now()
  )
  ON CONFLICT (provider_id, listing_id, slot_datetime_start)
  DO UPDATE SET is_available=false, is_reserved=true, recurring_blocked=true, slot_type='reserved';
END;
$$;