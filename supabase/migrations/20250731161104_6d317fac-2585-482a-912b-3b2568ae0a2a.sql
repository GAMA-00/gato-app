-- Crear trigger para generar slots automáticamente cuando se actualiza la disponibilidad del proveedor
CREATE OR REPLACE FUNCTION auto_generate_slots_for_provider_availability()
RETURNS TRIGGER AS $$
DECLARE
    listing_record RECORD;
    slots_created INTEGER;
    total_created INTEGER := 0;
BEGIN
    -- Solo procesar si es un INSERT o UPDATE que activa la disponibilidad
    IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR 
       (TG_OP = 'UPDATE' AND NEW.is_active = true AND (OLD.is_active = false OR OLD IS NULL)) OR
       (TG_OP = 'UPDATE' AND NEW.is_active = true AND (NEW.start_time != OLD.start_time OR NEW.end_time != OLD.end_time)) THEN
        
        RAISE LOG 'Disponibilidad actualizada para proveedor %, generando slots...', NEW.provider_id;
        
        -- Obtener todos los listings activos de este proveedor
        FOR listing_record IN 
            SELECT id, provider_id, title, standard_duration
            FROM listings 
            WHERE provider_id = NEW.provider_id 
            AND is_active = true
        LOOP
            -- Regenerar slots para este listing (eliminar futuros y crear nuevos)
            DELETE FROM provider_time_slots
            WHERE provider_id = NEW.provider_id
              AND listing_id = listing_record.id
              AND slot_date >= CURRENT_DATE
              AND is_reserved = false;
            
            -- Generar nuevos slots
            SELECT generate_provider_time_slots_for_listing(
                listing_record.provider_id,
                listing_record.id,
                4 -- 4 semanas adelante
            ) INTO slots_created;
            
            total_created := total_created + slots_created;
            
            RAISE LOG 'Generados % slots para listing % (%)', 
                slots_created, listing_record.title, listing_record.id;
        END LOOP;
        
        RAISE LOG 'Total de slots generados para proveedor %: %', NEW.provider_id, total_created;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger en la tabla provider_availability
DROP TRIGGER IF EXISTS trigger_auto_generate_slots ON provider_availability;
CREATE TRIGGER trigger_auto_generate_slots
    AFTER INSERT OR UPDATE ON provider_availability
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_slots_for_provider_availability();

-- Crear función para limpiar slots cuando se desactiva la disponibilidad
CREATE OR REPLACE FUNCTION auto_cleanup_slots_for_disabled_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se desactiva la disponibilidad, limpiar slots futuros no reservados
    IF OLD.is_active = true AND NEW.is_active = false THEN
        DELETE FROM provider_time_slots
        WHERE provider_id = NEW.provider_id
          AND slot_date >= CURRENT_DATE
          AND day_of_week = NEW.day_of_week
          AND is_reserved = false;
          
        RAISE LOG 'Limpiados slots futuros para día % del proveedor %', NEW.day_of_week, NEW.provider_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para limpieza
DROP TRIGGER IF EXISTS trigger_cleanup_disabled_availability ON provider_availability;
CREATE TRIGGER trigger_cleanup_disabled_availability
    AFTER UPDATE ON provider_availability
    FOR EACH ROW
    EXECUTE FUNCTION auto_cleanup_slots_for_disabled_availability();