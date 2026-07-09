-- Guarda los servicios seleccionados del carrito en custom_variable_selections
-- para que las tarjetas del proveedor muestren el servicio real elegido.
-- DROP de la firma vieja para evitar overload ambiguo en PostgREST.
DROP FUNCTION IF EXISTS public.create_external_booking(
  uuid, uuid, timestamptz, timestamptz, text, text, text, text, integer,
  double precision, double precision, jsonb, numeric, integer);

CREATE OR REPLACE FUNCTION public.create_external_booking(
  p_provider_id uuid,
  p_listing_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_client_name text,
  p_client_phone text,
  p_notes text DEFAULT '',
  p_client_address text DEFAULT NULL,
  p_canton_id integer DEFAULT NULL,
  p_client_lat double precision DEFAULT NULL,
  p_client_lng double precision DEFAULT NULL,
  p_address_detail jsonb DEFAULT NULL,
  p_final_price numeric DEFAULT NULL,
  p_total_duration integer DEFAULT NULL,
  p_selected_services jsonb DEFAULT NULL
)
RETURNS TABLE (appointment_id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment_id uuid;
  v_conflict_count integer;
  v_required_slots integer := 1;
  v_slot_minutes integer := 30;
  v_i integer;
  v_current timestamptz;
  v_buffer_enabled boolean := true;
  v_buffer_minutes integer := 30;
  v_buffer_slots integer := 0;
  v_buffer_start timestamptz;
BEGIN
  IF p_provider_id IS NULL OR p_listing_id IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
    RAISE EXCEPTION 'Faltan parámetros requeridos';
  END IF;
  IF coalesce(p_client_name, '') = '' OR coalesce(p_client_phone, '') = '' THEN
    RAISE EXCEPTION 'Nombre y WhatsApp del cliente son requeridos';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_provider_id AND role = 'provider' AND is_active = true) THEN
    RAISE EXCEPTION 'Proveedor no válido';
  END IF;

  IF p_total_duration IS NOT NULL AND p_total_duration > v_slot_minutes THEN
    v_required_slots := CEIL(p_total_duration::numeric / v_slot_minutes);
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
    RAISE EXCEPTION 'El horario ya no está disponible';
  END IF;

  INSERT INTO appointments (
    provider_id, listing_id, client_id, start_time, end_time,
    status, recurrence, notes, client_name, client_phone, client_address,
    external_booking, canton_id, client_lat, client_lng, address_detail,
    final_price, custom_variable_selections, created_at
  ) VALUES (
    p_provider_id, p_listing_id, NULL, p_start_time, p_end_time,
    'pending', 'none', coalesce(p_notes, ''), p_client_name, p_client_phone, p_client_address,
    true, p_canton_id, p_client_lat, p_client_lng, p_address_detail,
    p_final_price, p_selected_services, NOW()
  ) RETURNING id INTO v_appointment_id;

  -- Reservar los slots de la cita
  FOR v_i IN 0..(v_required_slots - 1) LOOP
    v_current := p_start_time + (v_i * (v_slot_minutes || ' minutes')::interval);
    INSERT INTO provider_time_slots (
      provider_id, listing_id, slot_date, start_time, end_time,
      slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type, created_at
    ) VALUES (
      p_provider_id, p_listing_id, v_current::date,
      v_current::time, (v_current + (v_slot_minutes || ' minutes')::interval)::time,
      v_current, v_current + (v_slot_minutes || ' minutes')::interval,
      false, true, 'reserved', NOW()
    ) ON CONFLICT (provider_id, listing_id, slot_datetime_start)
      DO UPDATE SET is_available = false, is_reserved = true, slot_type = 'reserved';
  END LOOP;

  -- Buffer de traslado posterior (según config del proveedor; default ON 30 min)
  SELECT ps.buffer_enabled, ps.buffer_minutes INTO v_buffer_enabled, v_buffer_minutes
  FROM provider_settings ps WHERE ps.provider_id = p_provider_id;
  v_buffer_enabled := COALESCE(v_buffer_enabled, true);
  v_buffer_minutes := COALESCE(v_buffer_minutes, 30);

  IF v_buffer_enabled AND v_buffer_minutes > 0 THEN
    v_buffer_slots := CEIL(v_buffer_minutes::numeric / v_slot_minutes);
    FOR v_i IN 0..(v_buffer_slots - 1) LOOP
      v_buffer_start := p_end_time + (v_i * (v_slot_minutes || ' minutes')::interval);
      INSERT INTO provider_time_slots (
        provider_id, listing_id, slot_date, start_time, end_time,
        slot_datetime_start, slot_datetime_end, is_available, is_reserved, slot_type, created_at
      ) VALUES (
        p_provider_id, p_listing_id, v_buffer_start::date,
        v_buffer_start::time, (v_buffer_start + (v_slot_minutes || ' minutes')::interval)::time,
        v_buffer_start, v_buffer_start + (v_slot_minutes || ' minutes')::interval,
        false, true, 'buffer', NOW()
      ) ON CONFLICT (provider_id, listing_id, slot_datetime_start)
        DO NOTHING;  -- no pisar una cita real adyacente
    END LOOP;
  END IF;

  RETURN QUERY SELECT v_appointment_id, 'created'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_external_booking(
  uuid, uuid, timestamptz, timestamptz, text, text, text, text, integer,
  double precision, double precision, jsonb, numeric, integer, jsonb
) TO anon, authenticated;
