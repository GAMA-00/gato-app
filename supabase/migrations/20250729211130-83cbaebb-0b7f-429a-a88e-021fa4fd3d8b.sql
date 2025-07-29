-- Crear función para generar slots de tiempo para proveedores
CREATE OR REPLACE FUNCTION generate_provider_time_slots(
  p_provider_id UUID,
  p_listing_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_days_of_week TEXT[],
  p_start_time TIME,
  p_end_time TIME,
  p_slot_duration_minutes INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  iter_date DATE;
  current_day_name TEXT;
  local_start_time TIME;
  local_end_time TIME;
  utc_start_datetime TIMESTAMP WITH TIME ZONE;
  utc_end_datetime TIMESTAMP WITH TIME ZONE;
  slots_created INTEGER := 0;
BEGIN
  -- Iterar sobre cada día en el rango de fechas
  iter_date := p_start_date;
  
  WHILE iter_date <= p_end_date LOOP
    -- Obtener el día de la semana en inglés (monday, tuesday, etc.)
    current_day_name := LOWER(TO_CHAR(iter_date, 'Day'));
    current_day_name := TRIM(current_day_name);
    
    -- Verificar si este día está en los días de trabajo especificados
    IF current_day_name = ANY(p_days_of_week) THEN
      -- Generar slots para este día
      local_start_time := p_start_time;
      
      WHILE local_start_time < p_end_time LOOP
        local_end_time := local_start_time + (p_slot_duration_minutes || ' minutes')::INTERVAL;
        
        -- No crear slot si el tiempo de fin excede el tiempo de trabajo
        IF local_end_time <= p_end_time THEN
          -- Crear timestamps completos con zona horaria de Costa Rica
          utc_start_datetime := (iter_date + local_start_time) AT TIME ZONE 'America/Costa_Rica';
          utc_end_datetime := (iter_date + local_end_time) AT TIME ZONE 'America/Costa_Rica';
          
          -- Insertar el slot solo si no está en el pasado
          IF utc_start_datetime > NOW() THEN
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
              local_start_time,
              local_end_time,
              utc_start_datetime,
              utc_end_datetime,
              true,
              false
            ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
            
            slots_created := slots_created + 1;
          END IF;
        END IF;
        
        -- Avanzar al siguiente slot
        local_start_time := local_start_time + (p_slot_duration_minutes || ' minutes')::INTERVAL;
      END LOOP;
    END IF;
    
    -- Avanzar al siguiente día
    iter_date := iter_date + 1;
  END LOOP;
  
  RETURN slots_created;
END;
$$;

-- Generar slots para el proveedor
SELECT generate_provider_time_slots(
  '39e28003-f962-4af9-92fe-13a0ca428eba'::uuid,  -- provider_id
  '9b5032ba-f51d-4354-bda3-d0718299de22'::uuid,  -- listing_id
  '2025-07-29'::date,                             -- start_date (hoy)
  '2025-08-29'::date,                             -- end_date (30 días desde hoy)
  ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],  -- days_of_week
  '09:00'::time,                                  -- start_time
  '18:00'::time,                                  -- end_time
  60                                              -- slot_duration_minutes
) as slots_created;