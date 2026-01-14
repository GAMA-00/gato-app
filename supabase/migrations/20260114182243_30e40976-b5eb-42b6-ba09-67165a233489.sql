-- Función para sincronizar slots con la configuración de disponibilidad
-- Esta función:
-- 1. Elimina slots de días deshabilitados (futuros, no reservados, no bloqueados manualmente)
-- 2. Elimina slots fuera de los rangos horarios configurados
-- 3. Genera nuevos slots para días/horarios agregados

CREATE OR REPLACE FUNCTION sync_slots_with_availability(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_id_var UUID;
  availability_data JSONB;
  slots_created INTEGER := 0;
  slots_deleted_days INTEGER := 0;
  slots_deleted_times INTEGER := 0;
BEGIN
  -- Obtener datos del listing
  SELECT provider_id, availability INTO provider_id_var, availability_data
  FROM listings WHERE id = p_listing_id;
  
  IF provider_id_var IS NULL THEN 
    RAISE LOG 'sync_slots_with_availability: Listing % no encontrado', p_listing_id;
    RETURN 0; 
  END IF;

  IF availability_data IS NULL THEN
    RAISE LOG 'sync_slots_with_availability: Listing % no tiene configuración de disponibilidad', p_listing_id;
    RETURN 0;
  END IF;

  RAISE LOG 'sync_slots_with_availability: Iniciando sincronización para listing %', p_listing_id;

  -- PASO 1: Eliminar slots de días que ya NO están habilitados
  -- Solo elimina slots futuros que NO estén reservados ni bloqueados manualmente
  DELETE FROM provider_time_slots
  WHERE listing_id = p_listing_id
    AND slot_date >= CURRENT_DATE
    AND is_reserved = false
    AND (slot_type IS NULL OR slot_type != 'manually_blocked')
    AND NOT EXISTS (
      SELECT 1 FROM (
        SELECT key as day_name, (value->>'enabled')::boolean as enabled
        FROM jsonb_each(availability_data)
      ) config
      WHERE config.enabled = true
        AND CASE EXTRACT(DOW FROM slot_date)
              WHEN 0 THEN 'sunday'
              WHEN 1 THEN 'monday'
              WHEN 2 THEN 'tuesday'
              WHEN 3 THEN 'wednesday'
              WHEN 4 THEN 'thursday'
              WHEN 5 THEN 'friday'
              WHEN 6 THEN 'saturday'
            END = config.day_name
    );
  
  GET DIAGNOSTICS slots_deleted_days = ROW_COUNT;
  RAISE LOG 'sync_slots_with_availability: Eliminados % slots de días deshabilitados', slots_deleted_days;

  -- PASO 2: Eliminar slots que están fuera de los nuevos rangos horarios
  -- (slots en días habilitados pero fuera de los timeSlots configurados)
  DELETE FROM provider_time_slots pts
  WHERE pts.listing_id = p_listing_id
    AND pts.slot_date >= CURRENT_DATE
    AND pts.is_reserved = false
    AND (pts.slot_type IS NULL OR pts.slot_type != 'manually_blocked')
    AND NOT EXISTS (
      SELECT 1 FROM (
        SELECT key as day_name, 
               jsonb_array_elements(value->'timeSlots') as slot_config
        FROM jsonb_each(availability_data)
        WHERE (value->>'enabled')::boolean = true
      ) config
      WHERE CASE EXTRACT(DOW FROM pts.slot_date)
              WHEN 0 THEN 'sunday'
              WHEN 1 THEN 'monday'
              WHEN 2 THEN 'tuesday'
              WHEN 3 THEN 'wednesday'
              WHEN 4 THEN 'thursday'
              WHEN 5 THEN 'friday'
              WHEN 6 THEN 'saturday'
            END = config.day_name
        AND pts.start_time >= (config.slot_config->>'startTime')::TIME
        AND pts.start_time < (config.slot_config->>'endTime')::TIME
    );

  GET DIAGNOSTICS slots_deleted_times = ROW_COUNT;
  RAISE LOG 'sync_slots_with_availability: Eliminados % slots fuera de rangos horarios', slots_deleted_times;

  -- PASO 3: Generar nuevos slots para días/horarios agregados
  -- La función existente usa ON CONFLICT DO NOTHING, así que es segura
  SELECT generate_provider_time_slots_for_listing(provider_id_var, p_listing_id, 4) 
  INTO slots_created;

  RAISE LOG 'sync_slots_with_availability: Sincronización completada - % slots eliminados (días), % slots eliminados (horarios), % slots creados', 
            slots_deleted_days, slots_deleted_times, slots_created;
  
  RETURN slots_created;
END;
$$;