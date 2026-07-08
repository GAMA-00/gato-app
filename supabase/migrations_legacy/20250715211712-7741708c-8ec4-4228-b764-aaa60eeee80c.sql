-- Corregir la función para que respete correctamente la disponibilidad del proveedor
CREATE OR REPLACE FUNCTION public.generate_provider_time_slots_for_listing(p_provider_id uuid, p_listing_id uuid, p_weeks_ahead integer DEFAULT 4)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
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
  max_slot_start TIME;
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
      
      -- Calcular el último slot posible que no exceda el horario de disponibilidad
      max_slot_start := availability_record.end_time - (service_duration || ' minutes')::INTERVAL;
      
      -- Generar slots cada X minutos según la duración del servicio
      slot_start := (iter_date + availability_record.start_time) AT TIME ZONE 'America/Costa_Rica';
      
      WHILE slot_start::TIME <= max_slot_start AND slot_start::TIME >= availability_record.start_time LOOP
        slot_end := slot_start + (service_duration || ' minutes')::INTERVAL;
        
        -- Verificar que el slot no exceda el horario de disponibilidad
        IF slot_end::TIME <= availability_record.end_time THEN
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
        END IF;
        
        -- Avanzar al siguiente slot
        slot_start := slot_start + (service_duration || ' minutes')::INTERVAL;
      END LOOP;
      
    END LOOP;
    
    iter_date := iter_date + 1;
  END LOOP;
  
  RETURN slots_created;
END;
$$;