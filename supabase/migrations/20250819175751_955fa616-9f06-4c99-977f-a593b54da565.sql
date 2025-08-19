-- Función mejorada para regenerar slots faltantes y eliminar slots incorrectos
CREATE OR REPLACE FUNCTION regenerate_provider_slots_for_week(
  provider_uuid UUID,
  listing_uuid UUID,
  start_date DATE,
  end_date DATE,
  service_duration_minutes INTEGER DEFAULT 60
) RETURNS void AS $$
DECLARE
  current_date DATE;
  availability_record RECORD;
  slot_time TIME;
  slot_datetime_start TIMESTAMP WITH TIME ZONE;
  slot_datetime_end TIMESTAMP WITH TIME ZONE;
  time_increment INTERVAL;
BEGIN
  -- Validar parámetros
  IF provider_uuid IS NULL OR listing_uuid IS NULL OR start_date IS NULL OR end_date IS NULL THEN
    RAISE EXCEPTION 'Parámetros no pueden ser nulos';
  END IF;
  
  -- Crear intervalo basado en duración del servicio
  time_increment := make_interval(mins => service_duration_minutes);
  
  -- Primero eliminar slots existentes generados automáticamente en el rango
  DELETE FROM provider_time_slots 
  WHERE provider_id = provider_uuid 
    AND listing_id = listing_uuid
    AND slot_date BETWEEN start_date AND end_date
    AND slot_type = 'generated'
    AND is_reserved = false;
  
  RAISE NOTICE 'Slots automáticos eliminados para regeneración';
  
  -- Iterar por cada día en el rango
  current_date := start_date;
  WHILE current_date <= end_date LOOP
    -- Obtener disponibilidad para este día de la semana
    FOR availability_record IN 
      SELECT day_of_week, start_time, end_time, is_active
      FROM provider_availability 
      WHERE provider_id = provider_uuid 
        AND day_of_week = EXTRACT(DOW FROM current_date)
        AND is_active = true
    LOOP
      -- Generar slots para este período de disponibilidad
      slot_time := availability_record.start_time;
      
      WHILE slot_time < availability_record.end_time LOOP
        -- Calcular datetime completo del slot
        slot_datetime_start := current_date + slot_time;
        slot_datetime_end := slot_datetime_start + time_increment;
        
        -- Verificar que el slot no exceda el horario de disponibilidad
        IF (slot_datetime_start::TIME) < availability_record.end_time THEN
          -- Insertar slot si no existe (upsert)
          INSERT INTO provider_time_slots (
            provider_id,
            listing_id,
            slot_date,
            start_time,
            end_time,
            slot_datetime_start,
            slot_datetime_end,
            is_available,
            is_reserved,
            slot_type
          ) VALUES (
            provider_uuid,
            listing_uuid,
            current_date,
            slot_time,
            (slot_datetime_end)::TIME,
            slot_datetime_start,
            slot_datetime_end,
            true,
            false,
            'generated'
          )
          ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
          DO NOTHING; -- No sobrescribir slots existentes
          
        END IF;
        
        -- Avanzar al siguiente slot
        slot_time := slot_time + time_increment;
      END LOOP;
    END LOOP;
    
    -- Siguiente día
    current_date := current_date + 1;
  END LOOP;
  
  RAISE NOTICE 'Regeneración de slots completada para el período % - %', start_date, end_date;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar regeneración para la semana actual
SELECT regenerate_provider_slots_for_week(
  '44e1c769-71f0-47db-add1-38af3fbe1595'::UUID,
  'f8e8554c-a1a3-4163-913f-dbf99d0cd812'::UUID,
  '2025-08-18'::DATE,
  '2025-08-24'::DATE,
  60
);