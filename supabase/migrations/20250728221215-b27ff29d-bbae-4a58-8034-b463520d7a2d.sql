-- Final batch of security fixes

-- Fix remaining functions with search_path
CREATE OR REPLACE FUNCTION public.regenerate_slots_for_listing(p_listing_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_id_var UUID;
  slots_created INTEGER;
BEGIN
  -- Obtener el provider_id del listing
  SELECT provider_id INTO provider_id_var
  FROM listings
  WHERE id = p_listing_id AND is_active = true;
  
  IF provider_id_var IS NULL THEN
    RAISE EXCEPTION 'Listing no encontrado o inactivo: %', p_listing_id;
  END IF;
  
  -- Eliminar slots futuros existentes para este listing
  DELETE FROM provider_time_slots
  WHERE listing_id = p_listing_id 
    AND slot_date >= CURRENT_DATE
    AND is_reserved = false;
  
  -- Generar nuevos slots
  SELECT generate_provider_time_slots_for_listing(provider_id_var, p_listing_id, 4) INTO slots_created;
  
  RETURN slots_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_recurring_slots()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Release recurring slots if appointment is cancelled/rejected
  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status NOT IN ('cancelled', 'rejected') THEN
    -- If it's a recurring appointment, release future slots
    IF NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none' THEN
      UPDATE provider_time_slots
      SET 
        is_available = true,
        is_reserved = false,
        recurring_blocked = false
      WHERE provider_id = NEW.provider_id
        AND recurring_blocked = true
        AND slot_datetime_start >= NEW.start_time;
    ELSE
      -- Regular appointment, just release this slot
      UPDATE provider_time_slots
      SET 
        is_available = true,
        is_reserved = false
      WHERE provider_id = NEW.provider_id
        AND slot_datetime_start = NEW.start_time
        AND slot_datetime_end = NEW.end_time;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_appointment_names()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Establecer el nombre del cliente
  SELECT name INTO NEW.client_name
  FROM users
  WHERE id = NEW.client_id;
  
  -- Establecer el nombre del proveedor
  SELECT name INTO NEW.provider_name
  FROM users
  WHERE id = NEW.provider_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_slot_as_reserved()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Marcar el slot como reservado
  UPDATE provider_time_slots
  SET is_reserved = true, is_available = false
  WHERE provider_id = NEW.provider_id
    AND slot_datetime_start = NEW.start_time
    AND slot_datetime_end = NEW.end_time;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_slot_on_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Liberar el slot si se cancela la cita
  IF NEW.status IN ('cancelled', 'rejected') AND OLD.status NOT IN ('cancelled', 'rejected') THEN
    UPDATE provider_time_slots
    SET is_reserved = false, is_available = true
    WHERE provider_id = NEW.provider_id
      AND slot_datetime_start = NEW.start_time
      AND slot_datetime_end = NEW.end_time;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_slots_for_listing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Auto-generar slots para las próximas 4 semanas cuando se crea un listing
  PERFORM generate_provider_time_slots(
    NEW.provider_id,
    NEW.id,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '4 weeks')::date
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_recurring_availability(p_provider_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_exclude_rule_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  conflict_count INTEGER;
  p_day_of_week INTEGER;
  p_time_of_day TIME;
  p_end_time_of_day TIME;
  p_day_of_month INTEGER;
BEGIN
  -- Extract components of time once - FIX THE EXTRACT ISSUE
  p_day_of_week := EXTRACT(DOW FROM p_start_time::TIMESTAMP)::INTEGER;
  p_time_of_day := p_start_time::TIME;
  p_end_time_of_day := p_end_time::TIME;
  p_day_of_month := EXTRACT(DAY FROM p_start_time::TIMESTAMP)::INTEGER;
  
  -- Verificar conflictos con reglas de recurrencia activas
  SELECT COUNT(*) INTO conflict_count
  FROM recurring_rules rr
  WHERE rr.provider_id = p_provider_id
    AND rr.is_active = true
    AND (p_exclude_rule_id IS NULL OR rr.id != p_exclude_rule_id)
    AND (
      -- Verificar si el tiempo solicitado coincide con alguna recurrencia
      (rr.recurrence_type = 'weekly' AND 
       p_day_of_week = rr.day_of_week AND
       rr.start_time < p_end_time_of_day AND
       rr.end_time > p_time_of_day)
      OR
      (rr.recurrence_type = 'biweekly' AND 
       p_day_of_week = rr.day_of_week AND
       EXTRACT(DAYS FROM p_start_time::DATE - rr.start_date)::INTEGER % 14 = 0 AND
       rr.start_time < p_end_time_of_day AND
       rr.end_time > p_time_of_day)
      OR
      (rr.recurrence_type = 'monthly' AND 
       p_day_of_month = rr.day_of_month AND
       rr.start_time < p_end_time_of_day AND
       rr.end_time > p_time_of_day)
    );
  
  RETURN conflict_count = 0;
END;
$$;