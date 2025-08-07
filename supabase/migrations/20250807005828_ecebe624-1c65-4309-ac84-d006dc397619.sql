-- Limpiar slots duplicados y conflictivos
-- Esta migración identifica y elimina slots duplicados que comparten la misma fecha, hora de inicio y proveedor/listing

-- Función para identificar y limpiar slots duplicados
CREATE OR REPLACE FUNCTION public.clean_duplicate_slots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  duplicate_record RECORD;
  slots_cleaned INTEGER := 0;
  kept_slot_id UUID;
BEGIN
  RAISE LOG 'Iniciando limpieza de slots duplicados...';
  
  -- Buscar grupos de slots duplicados (mismo proveedor, listing, fecha y hora de inicio)
  FOR duplicate_record IN 
    SELECT 
      provider_id,
      listing_id,
      slot_date,
      start_time,
      COUNT(*) as duplicate_count,
      ARRAY_AGG(id ORDER BY created_at DESC) as slot_ids,
      ARRAY_AGG(end_time ORDER BY created_at DESC) as end_times,
      ARRAY_AGG(is_available ORDER BY created_at DESC) as availabilities
    FROM provider_time_slots
    GROUP BY provider_id, listing_id, slot_date, start_time
    HAVING COUNT(*) > 1
  LOOP
    RAISE LOG 'Procesando duplicados para slot: % % % %', 
      duplicate_record.slot_date, duplicate_record.start_time, 
      duplicate_record.provider_id, duplicate_record.listing_id;
    
    -- Mantener el slot más reciente (primer elemento del array ordenado por created_at DESC)
    kept_slot_id := duplicate_record.slot_ids[1];
    
    -- Eliminar los duplicados (todos excepto el primero)
    DELETE FROM provider_time_slots 
    WHERE id = ANY(duplicate_record.slot_ids[2:array_length(duplicate_record.slot_ids, 1)]);
    
    GET DIAGNOSTICS slots_cleaned = ROW_COUNT;
    slots_cleaned := slots_cleaned + (duplicate_record.duplicate_count - 1);
    
    RAISE LOG 'Eliminados % slots duplicados, mantenido slot %', 
      (duplicate_record.duplicate_count - 1), kept_slot_id;
  END LOOP;
  
  RAISE LOG 'Limpieza completada. Total de slots duplicados eliminados: %', slots_cleaned;
  RETURN slots_cleaned;
END;
$$;

-- Ejecutar la limpieza
SELECT clean_duplicate_slots();

-- Agregar constraint único para prevenir duplicados futuros
-- Solo si no existe ya
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'provider_time_slots_unique_slot'
  ) THEN
    ALTER TABLE provider_time_slots 
    ADD CONSTRAINT provider_time_slots_unique_slot 
    UNIQUE (provider_id, listing_id, slot_date, start_time);
    
    RAISE LOG 'Constraint único agregado para prevenir duplicados futuros';
  ELSE
    RAISE LOG 'Constraint único ya existe';
  END IF;
END $$;

-- Función para validar y prevenir slots conflictivos durante la inserción
CREATE OR REPLACE FUNCTION public.validate_slot_insertion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar si ya existe un slot con la misma combinación
  IF EXISTS (
    SELECT 1 FROM provider_time_slots
    WHERE provider_id = NEW.provider_id
    AND listing_id = NEW.listing_id
    AND slot_date = NEW.slot_date
    AND start_time = NEW.start_time
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Ya existe un slot para el proveedor % en el listing % el día % a las %', 
      NEW.provider_id, NEW.listing_id, NEW.slot_date, NEW.start_time;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para validación (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'validate_slot_before_insert'
  ) THEN
    CREATE TRIGGER validate_slot_before_insert
      BEFORE INSERT OR UPDATE ON provider_time_slots
      FOR EACH ROW
      EXECUTE FUNCTION validate_slot_insertion();
    
    RAISE LOG 'Trigger de validación creado';
  ELSE
    RAISE LOG 'Trigger de validación ya existe';
  END IF;
END $$;