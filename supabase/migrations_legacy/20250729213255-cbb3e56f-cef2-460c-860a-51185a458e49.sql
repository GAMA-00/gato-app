-- ===== FASE 1: RESTRICCIÓN DE UN LISTING POR PROVEEDOR =====

-- Agregar constraint único para un listing por proveedor
-- Primero verificar si ya existe la constraint
DO $$ 
BEGIN
    -- Solo agregar si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_provider_listing' 
        AND table_name = 'listings'
    ) THEN
        ALTER TABLE listings ADD CONSTRAINT unique_provider_listing UNIQUE (provider_id);
    END IF;
END $$;

-- ===== FASE 2: FUNCIÓN PARA SINCRONIZAR DISPONIBILIDAD =====

-- Función para sincronizar availability del listing con provider_availability
CREATE OR REPLACE FUNCTION sync_listing_availability_to_provider()
RETURNS TRIGGER AS $$
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

-- ===== FASE 3: FUNCIÓN ROBUSTA PARA REGENERAR SLOTS =====

-- Función mejorada que maneja transacciones y evita inconsistencias
CREATE OR REPLACE FUNCTION regenerate_slots_for_listing_safe(p_listing_id UUID)
RETURNS INTEGER AS $$
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

-- ===== FASE 4: TRIGGERS PARA SINCRONIZACIÓN AUTOMÁTICA =====

-- Trigger para sincronizar availability cuando se actualiza un listing
DROP TRIGGER IF EXISTS sync_listing_availability_trigger ON listings;
CREATE TRIGGER sync_listing_availability_trigger
  AFTER INSERT OR UPDATE OF availability ON listings
  FOR EACH ROW
  EXECUTE FUNCTION sync_listing_availability_to_provider();

-- ===== FASE 5: AGREGAR COLUMNA AVAILABILITY AL LISTING =====

-- Agregar columna availability a listings si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' 
        AND column_name = 'availability'
    ) THEN
        ALTER TABLE listings ADD COLUMN availability JSONB;
    END IF;
END $$;

-- ===== FASE 6: FUNCIÓN PARA CONSOLIDAR PROVEEDORES CON MÚLTIPLES LISTINGS =====

-- Función para consolidar proveedores que tienen múltiples listings
CREATE OR REPLACE FUNCTION consolidate_multiple_listings()
RETURNS INTEGER AS $$
DECLARE
  provider_record RECORD;
  main_listing_id UUID;
  consolidated_count INTEGER := 0;
BEGIN
  -- Buscar proveedores con múltiples listings
  FOR provider_record IN 
    SELECT provider_id, COUNT(*) as listing_count
    FROM listings 
    WHERE is_active = true
    GROUP BY provider_id 
    HAVING COUNT(*) > 1
  LOOP
    -- Seleccionar el listing más reciente como principal
    SELECT id INTO main_listing_id
    FROM listings 
    WHERE provider_id = provider_record.provider_id 
      AND is_active = true
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Desactivar los otros listings del proveedor
    UPDATE listings 
    SET is_active = false
    WHERE provider_id = provider_record.provider_id 
      AND id != main_listing_id
      AND is_active = true;
    
    consolidated_count := consolidated_count + 1;
    
    RAISE LOG 'Consolidado proveedor % - manteniendo listing %', 
      provider_record.provider_id, main_listing_id;
  END LOOP;
  
  RETURN consolidated_count;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar consolidación de listings múltiples
SELECT consolidate_multiple_listings();

-- ===== FASE 7: FUNCIÓN HELPER PARA OBTENER EL ÚNICO LISTING DEL PROVEEDOR =====

CREATE OR REPLACE FUNCTION get_provider_listing(p_provider_id UUID)
RETURNS UUID AS $$
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