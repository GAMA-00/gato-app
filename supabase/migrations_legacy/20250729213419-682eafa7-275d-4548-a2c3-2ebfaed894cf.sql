-- ===== CONTINUACIÓN: FUNCIONES PARA SINCRONIZACIÓN Y SLOTS =====

-- Función para sincronizar availability del listing con provider_availability
CREATE OR REPLACE FUNCTION sync_listing_availability_to_provider()
RETURNS TRIGGER
SET search_path = public
AS $$
DECLARE
  availability_data JSONB;
  day_name TEXT;
  day_number INTEGER;
  time_slot JSONB;
  start_time TIME;
  end_time TIME;
  day_names TEXT[] := ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
BEGIN
  -- Solo procesar si hay datos de availability
  IF NEW.availability IS NOT NULL THEN
    -- Eliminar availability existente del proveedor
    DELETE FROM provider_availability WHERE provider_id = NEW.provider_id;
    
    -- Procesar cada día de la semana
    FOR i IN 0..6 LOOP
      day_name := day_names[i + 1];
      day_number := i;
      
      -- Obtener datos del día si existe y está habilitado
      availability_data := NEW.availability->day_name;
      
      IF availability_data IS NOT NULL AND (availability_data->>'enabled')::boolean = true THEN
        -- Procesar cada slot de tiempo del día
        FOR time_slot IN SELECT * FROM jsonb_array_elements(availability_data->'timeSlots')
        LOOP
          start_time := (time_slot->>'startTime')::TIME;
          end_time := (time_slot->>'endTime')::TIME;
          
          -- Insertar en provider_availability
          INSERT INTO provider_availability (
            provider_id,
            day_of_week,
            start_time,
            end_time,
            is_active
          ) VALUES (
            NEW.provider_id,
            day_number,
            start_time,
            end_time,
            true
          );
        END LOOP;
      END IF;
    END LOOP;
    
    -- Regenerar slots para este listing
    PERFORM regenerate_slots_for_listing(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función mejorada que maneja transacciones y evita inconsistencias
CREATE OR REPLACE FUNCTION regenerate_slots_for_listing_safe(p_listing_id UUID)
RETURNS INTEGER
SET search_path = public
AS $$
DECLARE
  provider_id_var UUID;
  slots_created INTEGER := 0;
  listing_duration INTEGER;
BEGIN
  -- Obtener datos del listing en una transacción
  SELECT provider_id, standard_duration INTO provider_id_var, listing_duration
  FROM listings 
  WHERE id = p_listing_id AND is_active = true;
  
  IF provider_id_var IS NULL THEN
    RAISE LOG 'Listing no encontrado o inactivo: %', p_listing_id;
    RETURN 0;
  END IF;
  
  -- Usar transacción para evitar estados inconsistentes
  BEGIN
    -- Eliminar slots futuros no reservados
    DELETE FROM provider_time_slots
    WHERE listing_id = p_listing_id 
      AND slot_date >= CURRENT_DATE
      AND is_reserved = false
      AND recurring_blocked = false;
    
    -- Generar nuevos slots
    SELECT generate_provider_time_slots_for_listing(provider_id_var, p_listing_id, 4) 
    INTO slots_created;
    
    RAISE LOG 'Regenerados % slots para listing %', slots_created, p_listing_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error regenerando slots para listing %: %', p_listing_id, SQLERRM;
    RETURN 0;
  END;
  
  RETURN slots_created;
END;
$$ LANGUAGE plpgsql;

-- Función helper para obtener el único listing del proveedor
CREATE OR REPLACE FUNCTION get_provider_listing(p_provider_id UUID)
RETURNS UUID
SET search_path = public
AS $$
DECLARE
  listing_id UUID;
BEGIN
  SELECT id INTO listing_id
  FROM listings 
  WHERE provider_id = p_provider_id 
    AND is_active = true
  LIMIT 1;
  
  RETURN listing_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronizar availability cuando se actualiza un listing
DROP TRIGGER IF EXISTS sync_listing_availability_trigger ON listings;
CREATE TRIGGER sync_listing_availability_trigger
  AFTER INSERT OR UPDATE OF availability ON listings
  FOR EACH ROW
  EXECUTE FUNCTION sync_listing_availability_to_provider();