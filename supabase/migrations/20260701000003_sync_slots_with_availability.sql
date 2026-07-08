-- Función para sincronizar provider_time_slots con la configuración de disponibilidad.
-- Lee desde provider_availability (fuente de verdad para slots) y listings.availability (para días deshabilitados).
-- 1. Elimina slots futuros no-reservados/no-bloqueados de días ahora desactivados.
-- 2. Elimina slots futuros que caen fuera de los nuevos rangos horarios.
-- 3. Genera nuevos slots para las horas/días habilitados (60 días hacia adelante).

CREATE OR REPLACE FUNCTION public.sync_slots_with_availability(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
  v_availability JSONB;
  v_slots_deleted_days INTEGER := 0;
  v_slots_deleted_times INTEGER := 0;
  v_slots_created INTEGER := 0;
BEGIN
  SELECT provider_id, availability
  INTO v_provider_id, v_availability
  FROM listings
  WHERE id = p_listing_id;

  IF v_provider_id IS NULL THEN
    RAISE LOG 'sync_slots_with_availability: listing % no encontrado', p_listing_id;
    RETURN 0;
  END IF;

  -- PASO 1: Eliminar slots de días deshabilitados (futuros, no reservados, no bloqueados manualmente)
  IF v_availability IS NOT NULL THEN
    DELETE FROM provider_time_slots
    WHERE listing_id = p_listing_id
      AND slot_date >= CURRENT_DATE
      AND is_reserved = false
      AND (slot_type IS NULL OR slot_type != 'manually_blocked')
      AND NOT EXISTS (
        SELECT 1
        FROM (
          SELECT key AS day_name, (value->>'enabled')::boolean AS enabled
          FROM jsonb_each(v_availability)
        ) cfg
        WHERE cfg.enabled = true
          AND CASE EXTRACT(DOW FROM slot_date)
                WHEN 0 THEN 'sunday'
                WHEN 1 THEN 'monday'
                WHEN 2 THEN 'tuesday'
                WHEN 3 THEN 'wednesday'
                WHEN 4 THEN 'thursday'
                WHEN 5 THEN 'friday'
                WHEN 6 THEN 'saturday'
              END = cfg.day_name
      );
    GET DIAGNOSTICS v_slots_deleted_days = ROW_COUNT;
  END IF;

  -- PASO 2: Eliminar slots fuera de los rangos horarios configurados
  DELETE FROM provider_time_slots pts
  WHERE pts.listing_id = p_listing_id
    AND pts.slot_date >= CURRENT_DATE
    AND pts.is_reserved = false
    AND (pts.slot_type IS NULL OR pts.slot_type != 'manually_blocked')
    AND NOT EXISTS (
      SELECT 1
      FROM provider_availability pa
      WHERE pa.provider_id = v_provider_id
        AND pa.is_active = true
        AND pa.day_of_week = EXTRACT(DOW FROM pts.slot_date)::integer
        AND pts.start_time >= pa.start_time
        AND pts.start_time < pa.end_time
    );
  GET DIAGNOSTICS v_slots_deleted_times = ROW_COUNT;

  -- PASO 3: Generar nuevos slots para rangos habilitados (60 días)
  SELECT generate_provider_time_slots_for_listing(v_provider_id, p_listing_id, 60)
  INTO v_slots_created;

  RAISE LOG 'sync_slots_with_availability: listing=% eliminados_dias=% eliminados_horarios=% creados=%',
    p_listing_id, v_slots_deleted_days, v_slots_deleted_times, v_slots_created;

  RETURN v_slots_created;
END;
$$;

-- Asegurar que el RPC sea accesible desde el cliente
GRANT EXECUTE ON FUNCTION public.sync_slots_with_availability(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_slots_with_availability(UUID) TO anon;
