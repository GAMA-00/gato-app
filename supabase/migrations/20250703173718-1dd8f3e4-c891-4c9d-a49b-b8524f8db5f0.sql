-- 4. Funciones para generar slots automáticamente
CREATE OR REPLACE FUNCTION generate_provider_time_slots(
  p_provider_id UUID,
  p_listing_id UUID,
  p_start_date DATE,
  p_end_date DATE
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
BEGIN
  -- Obtener la duración del servicio
  SELECT standard_duration INTO service_duration
  FROM listings 
  WHERE id = p_listing_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'No se encontró la duración estándar para el servicio %', p_listing_id;
  END IF;
  
  -- Iterar por cada día en el rango
  iter_date := p_start_date;
  WHILE iter_date <= p_end_date LOOP
    
    -- Obtener disponibilidad para este día de la semana
    FOR availability_record IN 
      SELECT day_of_week, start_time, end_time
      FROM provider_availability
      WHERE provider_id = p_provider_id 
        AND day_of_week = EXTRACT(DOW FROM iter_date)
        AND is_active = true
    LOOP
      
      -- Generar slots cada X minutos según la duración del servicio
      slot_start := iter_date + availability_record.start_time;
      
      WHILE slot_start + (service_duration || ' minutes')::INTERVAL <= iter_date + availability_record.end_time LOOP
        slot_end := slot_start + (service_duration || ' minutes')::INTERVAL;
        
        -- Insertar el slot si no existe
        INSERT INTO provider_time_slots (
          provider_id,
          listing_id,
          slot_date,
          start_time,
          end_time,
          slot_datetime_start,
          slot_datetime_end
        ) VALUES (
          p_provider_id,
          p_listing_id,
          iter_date,
          slot_start::TIME,
          slot_end::TIME,
          slot_start,
          slot_end
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

-- 5. Función para marcar slots como ocupados cuando se crea una cita
CREATE OR REPLACE FUNCTION mark_slot_as_reserved() RETURNS TRIGGER
LANGUAGE plpgsql
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

-- 6. Función para liberar slots cuando se cancela una cita
CREATE OR REPLACE FUNCTION release_slot_on_cancellation() RETURNS TRIGGER
LANGUAGE plpgsql
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