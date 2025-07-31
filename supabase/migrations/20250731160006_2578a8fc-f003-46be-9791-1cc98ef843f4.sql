-- Migrar la disponibilidad desde el listing a provider_availability y generar slots
DO $$
DECLARE
    listing_record RECORD;
    availability_data JSONB;
    day_availability JSONB;
    time_slot JSONB;
    day_of_week_num INTEGER;
    slots_created INTEGER;
BEGIN
    -- Obtener el listing específico
    SELECT * INTO listing_record 
    FROM listings 
    WHERE id = '4831d79a-d9b3-4dc4-a4fe-3507fb55a249'::UUID;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing no encontrado';
    END IF;
    
    availability_data := listing_record.availability;
    
    -- Procesar cada día de la semana
    FOR day_of_week_num IN 0..6 LOOP
        DECLARE
            day_name TEXT;
            day_config JSONB;
        BEGIN
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
            
            day_config := availability_data->day_name;
            
            -- Solo procesar si el día está habilitado
            IF (day_config->>'enabled')::BOOLEAN = true THEN
                -- Procesar cada slot de tiempo para este día
                FOR time_slot IN SELECT * FROM jsonb_array_elements(day_config->'timeSlots')
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
                    
                    RAISE LOG 'Configurada disponibilidad para % de % a %', day_name, time_slot->>'startTime', time_slot->>'endTime';
                END LOOP;
            END IF;
        END;
    END LOOP;
    
    -- Ahora generar los slots para este listing
    SELECT generate_provider_time_slots_for_listing(
        listing_record.provider_id,
        listing_record.id,
        4 -- 4 semanas adelante
    ) INTO slots_created;
    
    RAISE LOG 'Migrada disponibilidad y generados % slots para listing %', slots_created, listing_record.id;
END $$;