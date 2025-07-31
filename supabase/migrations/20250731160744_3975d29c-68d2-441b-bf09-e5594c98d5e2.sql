-- Función para migrar disponibilidad y generar slots para todos los proveedores
CREATE OR REPLACE FUNCTION migrate_all_provider_availability_and_generate_slots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    listing_record RECORD;
    availability_data JSONB;
    day_availability JSONB;
    time_slot JSONB;
    day_of_week_num INTEGER;
    slots_created INTEGER;
    total_slots INTEGER := 0;
    day_name TEXT;
BEGIN
    -- Procesar todos los listings activos que tengan availability configurada
    FOR listing_record IN 
        SELECT id, provider_id, availability, title
        FROM listings 
        WHERE is_active = true 
        AND availability IS NOT NULL
        AND availability != '{}'::jsonb
    LOOP
        RAISE LOG 'Procesando listing % (%) del proveedor %', listing_record.title, listing_record.id, listing_record.provider_id;
        
        availability_data := listing_record.availability;
        
        -- Procesar cada día de la semana
        FOR day_of_week_num IN 0..6 LOOP
            -- Mapear número de día a nombre
            day_name := CASE day_of_week_num
                WHEN 0 THEN 'sunday'
                WHEN 1 THEN 'monday'
                WHEN 2 THEN 'tuesday'
                WHEN 3 THEN 'wednesday'
                WHEN 4 THEN 'thursday'
                WHEN 5 THEN 'friday'
                WHEN 6 THEN 'saturday'
            END;
            
            day_availability := availability_data->day_name;
            
            -- Solo procesar si el día está habilitado
            IF (day_availability->>'enabled')::BOOLEAN = true THEN
                -- Procesar cada slot de tiempo para este día
                FOR time_slot IN SELECT * FROM jsonb_array_elements(day_availability->'timeSlots')
                LOOP
                    -- Insertar en provider_availability
                    INSERT INTO provider_availability (
                        provider_id,
                        day_of_week,
                        start_time,
                        end_time,
                        is_active
                    ) VALUES (
                        listing_record.provider_id,
                        day_of_week_num,
                        (time_slot->>'startTime')::TIME,
                        (time_slot->>'endTime')::TIME,
                        true
                    ) ON CONFLICT (provider_id, day_of_week, start_time, end_time) DO NOTHING;
                    
                END LOOP;
            END IF;
        END LOOP;
        
        -- Generar slots para este listing
        SELECT generate_provider_time_slots_for_listing(
            listing_record.provider_id,
            listing_record.id,
            4 -- 4 semanas adelante
        ) INTO slots_created;
        
        total_slots := total_slots + slots_created;
        RAISE LOG 'Generados % slots para listing %', slots_created, listing_record.title;
        
    END LOOP;
    
    RAISE LOG 'Total de slots generados: %', total_slots;
    RETURN total_slots;
END;
$$;

-- Ejecutar la función para migrar todo
SELECT migrate_all_provider_availability_and_generate_slots() as total_slots_generated;