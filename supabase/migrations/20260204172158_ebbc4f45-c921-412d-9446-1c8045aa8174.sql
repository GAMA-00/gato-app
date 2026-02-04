-- ============================================
-- MIGRACIÓN: Sistema de Slots de 30 Minutos
-- ============================================

-- 1. Función auxiliar para calcular slots requeridos
CREATE OR REPLACE FUNCTION calculate_required_slots(p_duration_minutes integer)
RETURNS integer AS $$
BEGIN
  RETURN CEIL(p_duration_minutes::numeric / 30);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Función para liberar locks expirados
CREATE OR REPLACE FUNCTION release_expired_slot_locks()
RETURNS integer AS $$
DECLARE
  v_released integer;
BEGIN
  UPDATE provider_time_slots 
  SET blocked_until = NULL
  WHERE blocked_until IS NOT NULL 
    AND blocked_until <= CURRENT_DATE;
  
  GET DIAGNOSTICS v_released = ROW_COUNT;
  RETURN v_released;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar generate_provider_time_slots_for_listing(uuid, uuid) a 30 minutos
DROP FUNCTION IF EXISTS public.generate_provider_time_slots_for_listing(uuid, uuid);

CREATE OR REPLACE FUNCTION public.generate_provider_time_slots_for_listing(p_provider_id uuid, p_listing_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date date;
  v_end_date date;
  v_current_date date;
  v_day_name text;
  v_slot_start time;
  v_slot_end time;
  v_slot_datetime_start timestamptz;
  v_slot_datetime_end timestamptz;
  v_availability jsonb;
  v_day_config jsonb;
  v_time_slot jsonb;
  v_slot_duration_minutes integer := 30; -- STANDARDIZED: Always 30 minutes
  v_slots_inserted integer := 0;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_start_date := CURRENT_DATE;
  v_end_date := CURRENT_DATE + INTERVAL '60 days';

  SELECT availability INTO v_availability
  FROM listings
  WHERE id = p_listing_id AND provider_id = p_provider_id;

  IF v_availability IS NULL THEN
    RAISE NOTICE 'No availability configured for listing %', p_listing_id;
    RETURN;
  END IF;

  v_current_date := v_start_date;
  WHILE v_current_date <= v_end_date LOOP
    v_day_name := LOWER(TO_CHAR(v_current_date, 'fmday'));
    v_day_config := v_availability -> v_day_name;
    
    IF v_day_config IS NOT NULL AND (v_day_config ->> 'enabled')::boolean = true THEN
      FOR v_time_slot IN SELECT * FROM jsonb_array_elements(v_day_config -> 'timeSlots')
      LOOP
        v_slot_start := (v_time_slot ->> 'startTime')::time;
        
        WHILE v_slot_start + (v_slot_duration_minutes || ' minutes')::interval <= (v_time_slot ->> 'endTime')::time LOOP
          v_slot_end := v_slot_start + (v_slot_duration_minutes || ' minutes')::interval;
          v_slot_datetime_start := v_current_date + v_slot_start;
          v_slot_datetime_end := v_current_date + v_slot_end;
          
          INSERT INTO provider_time_slots (
            provider_id, listing_id, slot_date, start_time, end_time,
            slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type
          ) VALUES (
            p_provider_id, p_listing_id, v_current_date, v_slot_start, v_slot_end,
            v_slot_datetime_start, v_slot_datetime_end, true, false, 'generated'
          )
          ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
          
          v_slots_inserted := v_slots_inserted + 1;
          v_slot_start := v_slot_end;
        END LOOP;
      END LOOP;
    END IF;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RAISE NOTICE 'Generated % slots for listing %', v_slots_inserted, p_listing_id;
END;
$function$;

-- 4. Actualizar versión con 3 parámetros también a 30 minutos
DROP FUNCTION IF EXISTS public.generate_provider_time_slots_for_listing(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.generate_provider_time_slots_for_listing(
  p_provider_id uuid, 
  p_listing_id uuid,
  p_weeks_ahead integer DEFAULT 8
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date date;
  v_end_date date;
  v_current_date date;
  v_day_name text;
  v_slot_start time;
  v_slot_end time;
  v_slot_datetime_start timestamptz;
  v_slot_datetime_end timestamptz;
  v_availability jsonb;
  v_day_config jsonb;
  v_time_slot jsonb;
  v_slot_duration_minutes integer := 30; -- STANDARDIZED: Always 30 minutes
  v_slots_inserted integer := 0;
BEGIN
  IF auth.uid() IS NULL AND current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_start_date := CURRENT_DATE;
  v_end_date := CURRENT_DATE + (p_weeks_ahead * 7 || ' days')::interval;

  SELECT availability INTO v_availability
  FROM listings
  WHERE id = p_listing_id AND provider_id = p_provider_id;

  IF v_availability IS NULL THEN
    RAISE NOTICE 'No availability configured for listing %', p_listing_id;
    RETURN;
  END IF;

  v_current_date := v_start_date;
  WHILE v_current_date <= v_end_date LOOP
    v_day_name := LOWER(TO_CHAR(v_current_date, 'fmday'));
    v_day_config := v_availability -> v_day_name;
    
    IF v_day_config IS NOT NULL AND (v_day_config ->> 'enabled')::boolean = true THEN
      FOR v_time_slot IN SELECT * FROM jsonb_array_elements(v_day_config -> 'timeSlots')
      LOOP
        v_slot_start := (v_time_slot ->> 'startTime')::time;
        
        WHILE v_slot_start + (v_slot_duration_minutes || ' minutes')::interval <= (v_time_slot ->> 'endTime')::time LOOP
          v_slot_end := v_slot_start + (v_slot_duration_minutes || ' minutes')::interval;
          v_slot_datetime_start := v_current_date + v_slot_start;
          v_slot_datetime_end := v_current_date + v_slot_end;
          
          INSERT INTO provider_time_slots (
            provider_id, listing_id, slot_date, start_time, end_time,
            slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type
          ) VALUES (
            p_provider_id, p_listing_id, v_current_date, v_slot_start, v_slot_end,
            v_slot_datetime_start, v_slot_datetime_end, true, false, 'generated'
          )
          ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
          
          v_slots_inserted := v_slots_inserted + 1;
          v_slot_start := v_slot_end;
        END LOOP;
      END LOOP;
    END IF;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RAISE NOTICE 'Generated % slots for listing %', v_slots_inserted, p_listing_id;
END;
$function$;

-- 5. Actualizar create_appointment_with_slot_extended para 30 minutos
CREATE OR REPLACE FUNCTION public.create_appointment_with_slot_extended(
  p_provider_id uuid, 
  p_listing_id uuid, 
  p_client_id uuid, 
  p_start_time timestamp with time zone, 
  p_end_time timestamp with time zone, 
  p_recurrence text DEFAULT 'none'::text, 
  p_notes text DEFAULT ''::text, 
  p_client_name text DEFAULT 'Cliente'::text, 
  p_client_email text DEFAULT NULL::text, 
  p_client_phone text DEFAULT NULL::text, 
  p_client_address text DEFAULT NULL::text, 
  p_residencia_id uuid DEFAULT NULL::uuid, 
  p_selected_slot_ids text[] DEFAULT NULL::text[], 
  p_total_duration integer DEFAULT NULL::integer
)
 RETURNS TABLE(appointment_id uuid, status text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_appointment_id UUID;
  v_conflict_count INTEGER;
  v_required_slots INTEGER := 1;
  v_i INTEGER;
  v_current_slot_time TIMESTAMPTZ;
  v_slot_duration_minutes INTEGER := 30; -- STANDARDIZED: Always 30 minutes
BEGIN
  IF p_provider_id IS NULL OR p_listing_id IS NULL OR p_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters';
  END IF;

  IF p_total_duration IS NOT NULL AND p_total_duration > v_slot_duration_minutes THEN
    v_required_slots := CEIL(p_total_duration::NUMERIC / v_slot_duration_minutes);
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM appointments a
  WHERE a.provider_id = p_provider_id 
    AND a.status IN ('pending', 'confirmed')
    AND (
      (a.start_time <= p_start_time AND a.end_time > p_start_time) OR
      (a.start_time < p_end_time AND a.end_time >= p_end_time) OR
      (a.start_time >= p_start_time AND a.end_time <= p_end_time)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Time slot conflicts with existing appointment';
  END IF;

  INSERT INTO appointments (
    provider_id, listing_id, client_id, start_time, end_time,
    status, recurrence, notes, client_name, client_email,
    client_phone, client_address, residencia_id, created_at
  ) VALUES (
    p_provider_id, p_listing_id, p_client_id, p_start_time, p_end_time,
    'pending', p_recurrence, COALESCE(p_notes, ''),
    COALESCE(p_client_name, 'Cliente'), p_client_email,
    p_client_phone, p_client_address, p_residencia_id, NOW()
  ) RETURNING id INTO v_appointment_id;

  FOR v_i IN 0..(v_required_slots - 1) LOOP
    v_current_slot_time := p_start_time + (v_i * (v_slot_duration_minutes || ' minutes')::interval);
    
    INSERT INTO provider_time_slots (
      provider_id, listing_id, slot_date, start_time, end_time,
      slot_datetime_start, slot_datetime_end, is_available,
      is_reserved, slot_type, created_at
    ) VALUES (
      p_provider_id, p_listing_id, v_current_slot_time::DATE,
      v_current_slot_time::TIME, (v_current_slot_time + (v_slot_duration_minutes || ' minutes')::interval)::TIME,
      v_current_slot_time, v_current_slot_time + (v_slot_duration_minutes || ' minutes')::interval,
      false, true, 'reserved', NOW()
    ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
    DO UPDATE SET is_available = false, is_reserved = true, slot_type = 'reserved';
  END LOOP;

  RETURN QUERY SELECT v_appointment_id, 'created'::TEXT;
END;
$function$;

-- 6. Función unificada para obtener slots recomendados
CREATE OR REPLACE FUNCTION get_recommended_slots(
  p_provider_id uuid,
  p_start_date date,
  p_end_date date,
  p_client_residencia_id uuid DEFAULT NULL
) 
RETURNS TABLE (
  slot_id uuid,
  slot_date date,
  start_time time,
  is_recommended boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_slot_duration_minutes INTEGER := 30;
BEGIN
  RETURN QUERY
  WITH confirmed_appointments AS (
    SELECT 
      a.start_time AS appt_start,
      a.end_time AS appt_end,
      a.residencia_id
    FROM appointments a
    WHERE a.provider_id = p_provider_id
      AND a.status IN ('confirmed', 'completed')
      AND a.start_time::date BETWEEN p_start_date AND p_end_date
  ),
  blocked_recurring AS (
    SELECT 
      pts.slot_date AS block_date,
      pts.start_time AS block_start,
      pts.end_time AS block_end
    FROM provider_time_slots pts
    WHERE pts.provider_id = p_provider_id
      AND pts.recurring_blocked = true
      AND pts.slot_date BETWEEN p_start_date AND p_end_date
  )
  SELECT 
    pts.id AS slot_id,
    pts.slot_date,
    pts.start_time,
    (
      EXISTS (
        SELECT 1 FROM confirmed_appointments ca
        WHERE ca.appt_start::date = pts.slot_date
          AND (pts.start_time + (v_slot_duration_minutes || ' minutes')::interval) = ca.appt_start::time
          AND (p_client_residencia_id IS NULL OR ca.residencia_id = p_client_residencia_id)
      )
      OR
      EXISTS (
        SELECT 1 FROM confirmed_appointments ca
        WHERE ca.appt_end::date = pts.slot_date
          AND pts.start_time = ca.appt_end::time
          AND (p_client_residencia_id IS NULL OR ca.residencia_id = p_client_residencia_id)
      )
      OR
      EXISTS (
        SELECT 1 FROM blocked_recurring br
        WHERE br.block_date = pts.slot_date
          AND (
            (pts.start_time + (v_slot_duration_minutes || ' minutes')::interval) = br.block_start
            OR pts.start_time = br.block_end
          )
      )
    ) AS is_recommended
  FROM provider_time_slots pts
  WHERE pts.provider_id = p_provider_id
    AND pts.is_available = true
    AND pts.is_reserved = false
    AND pts.slot_date BETWEEN p_start_date AND p_end_date;
END;
$$;

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_provider_time_slots_blocked_until 
ON provider_time_slots(blocked_until) 
WHERE blocked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_time_slots_lookup 
ON provider_time_slots(provider_id, slot_date, start_time);