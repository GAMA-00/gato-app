-- Función para generar slots de tiempo basados en la disponibilidad del proveedor
CREATE OR REPLACE FUNCTION generate_provider_time_slots(
  provider_uuid UUID,
  listing_uuid UUID,
  availability_data JSONB,
  service_duration INTEGER DEFAULT 60,
  days_ahead INTEGER DEFAULT 14
)
RETURNS VOID AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  end_date DATE := CURRENT_DATE + INTERVAL '1 day' * days_ahead;
  day_name TEXT;
  day_config JSONB;
  time_slot JSONB;
  slot_start_time TIME;
  slot_end_time TIME;
  current_time TIME;
  slot_datetime TIMESTAMP;
  slot_end_datetime TIMESTAMP;
BEGIN
  -- Limpiar slots existentes para este proveedor y listing
  DELETE FROM provider_time_slots 
  WHERE provider_id = provider_uuid 
    AND listing_id = listing_uuid 
    AND slot_date >= current_date;

  -- Generar slots para cada día en el rango especificado
  WHILE current_date <= end_date LOOP
    -- Obtener el nombre del día en inglés
    day_name := CASE EXTRACT(DOW FROM current_date)
      WHEN 0 THEN 'sunday'
      WHEN 1 THEN 'monday'
      WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday'
      WHEN 5 THEN 'friday'
      WHEN 6 THEN 'saturday'
    END;

    -- Obtener la configuración de disponibilidad para este día
    day_config := availability_data -> day_name;

    -- Si el día está habilitado y tiene time slots
    IF (day_config ->> 'enabled')::BOOLEAN = TRUE AND 
       jsonb_array_length(day_config -> 'timeSlots') > 0 THEN
      
      -- Iterar sobre cada time slot del día
      FOR time_slot IN SELECT * FROM jsonb_array_elements(day_config -> 'timeSlots') LOOP
        slot_start_time := (time_slot ->> 'startTime')::TIME;
        slot_end_time := (time_slot ->> 'endTime')::TIME;
        
        -- Generar slots cada "service_duration" minutos
        current_time := slot_start_time;
        
        WHILE current_time + INTERVAL '1 minute' * service_duration <= slot_end_time LOOP
          slot_datetime := current_date + current_time;
          slot_end_datetime := slot_datetime + INTERVAL '1 minute' * service_duration;
          
          -- Solo insertar slots futuros
          IF slot_datetime > NOW() THEN
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
              provider_uuid,
              listing_uuid,
              current_date,
              current_time,
              current_time + INTERVAL '1 minute' * service_duration,
              slot_datetime,
              slot_end_datetime,
              TRUE,
              FALSE
            );
          END IF;
          
          -- Avanzar al siguiente slot
          current_time := current_time + INTERVAL '1 minute' * service_duration;
        END LOOP;
      END LOOP;
    END IF;

    -- Avanzar al siguiente día
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para regenerar slots automáticamente cuando se actualiza un listing
CREATE OR REPLACE FUNCTION trigger_regenerate_time_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo regenerar si cambió la disponibilidad
  IF OLD.availability IS DISTINCT FROM NEW.availability THEN
    PERFORM generate_provider_time_slots(
      NEW.provider_id,
      NEW.id,
      NEW.availability,
      COALESCE(NEW.standard_duration, 60),
      14 -- 2 semanas adelante
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS regenerate_slots_on_availability_change ON listings;
CREATE TRIGGER regenerate_slots_on_availability_change
  AFTER UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_regenerate_time_slots();

-- Generar slots para el listing específico que tiene problemas
SELECT generate_provider_time_slots(
  '515541fc-a4ed-465d-b6e0-321f9c01b5b1'::UUID,
  '4831d79a-d9b3-4dc4-a4fe-3507fb55a249'::UUID,
  '{"monday":{"enabled":true,"timeSlots":[{"startTime":"09:00","endTime":"17:00"}]},"tuesday":{"enabled":true,"timeSlots":[{"startTime":"09:00","endTime":"17:00"}]},"wednesday":{"enabled":false,"timeSlots":[]},"thursday":{"enabled":false,"timeSlots":[]},"friday":{"enabled":false,"timeSlots":[]},"saturday":{"enabled":false,"timeSlots":[]},"sunday":{"enabled":true,"timeSlots":[{"startTime":"09:00","endTime":"17:00"}]}}'::JSONB,
  60,
  14
);