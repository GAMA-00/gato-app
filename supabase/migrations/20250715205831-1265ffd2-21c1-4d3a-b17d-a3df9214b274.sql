-- Crear función para generar slots de tiempo para un proveedor y listing específico
CREATE OR REPLACE FUNCTION generate_provider_time_slots_for_listing(
  p_provider_id UUID,
  p_listing_id UUID,
  p_weeks_ahead INTEGER DEFAULT 4
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  availability_record RECORD;
  iter_date DATE;
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  service_duration INTEGER;
  slots_created INTEGER := 0;
  row_count_var INTEGER;
  end_date DATE;
BEGIN
  -- Obtener la duración del servicio
  SELECT standard_duration INTO service_duration
  FROM listings 
  WHERE id = p_listing_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'No se encontró la duración estándar para el servicio %', p_listing_id;
  END IF;
  
  -- Calcular fecha límite
  end_date := CURRENT_DATE + (p_weeks_ahead * 7);
  
  -- Iterar por cada día en el rango
  iter_date := CURRENT_DATE;
  WHILE iter_date <= end_date LOOP
    
    -- Obtener disponibilidad para este día de la semana
    FOR availability_record IN 
      SELECT day_of_week, start_time, end_time
      FROM provider_availability
      WHERE provider_id = p_provider_id 
        AND day_of_week = EXTRACT(DOW FROM iter_date)
        AND is_active = true
    LOOP
      
      -- Generar slots cada X minutos según la duración del servicio
      slot_start := (iter_date + availability_record.start_time) AT TIME ZONE 'America/Costa_Rica';
      
      WHILE slot_start + (service_duration || ' minutes')::INTERVAL <= (iter_date + availability_record.end_time) AT TIME ZONE 'America/Costa_Rica' LOOP
        slot_end := slot_start + (service_duration || ' minutes')::INTERVAL;
        
        -- Insertar el slot si no existe
        INSERT INTO provider_time_slots (
          provider_id,
          listing_id,
          slot_date,
          start_time,
          end_time,
          slot_datetime_start,
          slot_datetime_end,
          is_available,
          is_reserved
        ) VALUES (
          p_provider_id,
          p_listing_id,
          iter_date,
          slot_start::TIME,
          slot_end::TIME,
          slot_start,
          slot_end,
          true,
          false
        ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
        
        GET DIAGNOSTICS row_count_var = ROW_COUNT;
        slots_created := slots_created + row_count_var;
        
        -- Avanzar al siguiente slot
        slot_start := slot_end;
      END LOOP;
      
    END LOOP;
    
    iter_date := iter_date + 1;
  END LOOP;
  
  RETURN slots_created;
END;
$$;

-- Crear trigger para generar slots automáticamente cuando se crea un listing
CREATE OR REPLACE FUNCTION auto_generate_slots_for_new_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  slots_created INTEGER;
BEGIN
  -- Solo generar slots para listings activos
  IF NEW.is_active = true THEN
    SELECT generate_provider_time_slots_for_listing(NEW.provider_id, NEW.id, 4) INTO slots_created;
    RAISE LOG 'Auto-generated % slots for new listing %', slots_created, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_slots ON listings;
CREATE TRIGGER trigger_auto_generate_slots
  AFTER INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slots_for_new_listing();

-- Función para regenerar slots para listings existentes
CREATE OR REPLACE FUNCTION regenerate_slots_for_listing(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
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