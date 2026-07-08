-- Función para limpiar slots incorrectos y regenerar slots consistentes
CREATE OR REPLACE FUNCTION public.fix_provider_slot_consistency(
  p_provider_id UUID,
  p_listing_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  slots_fixed INTEGER := 0;
  listing_record RECORD;
  availability_record RECORD;
  iter_date DATE;
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  service_duration INTEGER;
  day_availability JSONB;
  time_slot JSONB;
  day_of_week_num INTEGER;
  day_name TEXT;
BEGIN
  -- Si se especifica un listing específico, procesarlo
  IF p_listing_id IS NOT NULL THEN
    SELECT id, availability, standard_duration INTO listing_record
    FROM listings 
    WHERE id = p_listing_id AND provider_id = p_provider_id AND is_active = true;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Listing no encontrado o no pertenece al proveedor';
    END IF;
    
    -- Eliminar slots que estén fuera del horario configurado
    DELETE FROM provider_time_slots pts
    WHERE pts.provider_id = p_provider_id 
      AND pts.listing_id = p_listing_id
      AND NOT EXISTS (
        SELECT 1 FROM provider_availability pa
        WHERE pa.provider_id = p_provider_id
          AND pa.day_of_week = EXTRACT(DOW FROM pts.slot_date)::INTEGER
          AND pa.is_active = true
          AND pts.start_time >= pa.start_time
          AND pts.start_time < pa.end_time
      )
      AND pts.is_reserved = false
      AND pts.slot_type != 'manually_blocked';
    
    GET DIAGNOSTICS slots_fixed = ROW_COUNT;
    
    -- Regenerar slots para las próximas 4 semanas
    SELECT generate_provider_time_slots_for_listing(p_provider_id, p_listing_id, 4) INTO slots_fixed;
    
  ELSE
    -- Procesar todos los listings del proveedor
    FOR listing_record IN 
      SELECT id, availability, standard_duration
      FROM listings 
      WHERE provider_id = p_provider_id AND is_active = true
    LOOP
      -- Eliminar slots que estén fuera del horario configurado
      DELETE FROM provider_time_slots pts
      WHERE pts.provider_id = p_provider_id 
        AND pts.listing_id = listing_record.id
        AND NOT EXISTS (
          SELECT 1 FROM provider_availability pa
          WHERE pa.provider_id = p_provider_id
            AND pa.day_of_week = EXTRACT(DOW FROM pts.slot_date)::INTEGER
            AND pa.is_active = true
            AND pts.start_time >= pa.start_time
            AND pts.start_time < pa.end_time
        )
        AND pts.is_reserved = false
        AND pts.slot_type != 'manually_blocked';
      
      -- Regenerar slots para este listing
      SELECT generate_provider_time_slots_for_listing(p_provider_id, listing_record.id, 4) INTO slots_fixed;
    END LOOP;
  END IF;
  
  RETURN slots_fixed;
END;
$$;