-- Fix Friday slots generation issue
-- This migration addresses the problem where Friday slots are not being generated correctly

-- 1. Clean up problematic Friday slots first
DELETE FROM provider_time_slots 
WHERE slot_date = '2025-08-08' 
AND provider_id = '44e1c769-71f0-47db-add1-38af3fbe1595' 
AND listing_id = 'f8e8554c-a1a3-4163-913f-dbf99d0cd812';

-- 2. Improved slot generation function with better Friday handling
CREATE OR REPLACE FUNCTION public.generate_provider_time_slots_for_listing(p_provider_id uuid, p_listing_id uuid, p_weeks_ahead integer DEFAULT 4)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  availability_data JSONB;
  day_availability JSONB;
  time_slot JSONB;
  day_of_week_num INTEGER;
  day_name TEXT;
  iter_date DATE;
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  service_duration INTEGER;
  slots_created INTEGER := 0;
  row_count_var INTEGER;
  end_date DATE;
  local_slot_start TIME;
  local_slot_end TIME;
  debug_day_slots INTEGER := 0;
BEGIN
  -- Obtener la duración del servicio y availability
  SELECT standard_duration, availability INTO service_duration, availability_data
  FROM listings 
  WHERE id = p_listing_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'No se encontró la duración estándar para el servicio %', p_listing_id;
  END IF;
  
  -- Validar availability_data
  IF availability_data IS NULL THEN
    RAISE LOG 'No hay availability configurada para listing %', p_listing_id;
    RETURN 0;
  END IF;
  
  -- Si availability_data es un string, convertirlo a JSONB
  IF jsonb_typeof(availability_data) = 'string' THEN
    availability_data := (availability_data->>0)::jsonb;
  END IF;
  
  RAISE LOG 'Generando slots para listing % con duración % minutos', p_listing_id, service_duration;
  
  -- Calcular fecha límite
  end_date := CURRENT_DATE + (p_weeks_ahead * 7);
  
  -- Iterar por cada día en el rango
  iter_date := CURRENT_DATE;
  WHILE iter_date <= end_date LOOP
    
    -- Obtener el día de la semana (0-6, domingo=0)
    day_of_week_num := EXTRACT(DOW FROM iter_date);
    
    -- Mapear número de día a nombre con validación explícita
    day_name := CASE day_of_week_num
      WHEN 0 THEN 'sunday'
      WHEN 1 THEN 'monday'
      WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday'
      WHEN 5 THEN 'friday'
      WHEN 6 THEN 'saturday'
      ELSE 'unknown'
    END;
    
    -- Debug específico para viernes
    IF day_name = 'friday' THEN
      RAISE LOG 'Procesando VIERNES % - day_of_week_num: %, day_name: %', iter_date, day_of_week_num, day_name;
    END IF;
    
    -- Intentar obtener la disponibilidad del día
    BEGIN
      day_availability := availability_data->day_name;
      
      IF day_availability IS NOT NULL THEN
        RAISE LOG 'Día % (%) - availability encontrada: %', iter_date, day_name, day_availability::text;
        
        -- Verificar si el día está habilitado
        IF (day_availability->>'enabled')::BOOLEAN = true THEN
          RAISE LOG 'Día % habilitado, procesando time slots', day_name;
          
          debug_day_slots := 0;
          
          -- Procesar cada slot de tiempo para este día
          FOR time_slot IN SELECT * FROM jsonb_array_elements(day_availability->'timeSlots')
          LOOP
            local_slot_start := (time_slot->>'startTime')::TIME;
            local_slot_end := (time_slot->>'endTime')::TIME;
            
            RAISE LOG 'Slot de tiempo: % a % para día %', local_slot_start, local_slot_end, day_name;
            
            -- Generar slots cada X minutos dentro del rango
            WHILE local_slot_start + (service_duration || ' minutes')::INTERVAL <= local_slot_end LOOP
              -- Crear el timestamp UTC correcto
              slot_start := (iter_date + local_slot_start) AT TIME ZONE 'America/Costa_Rica';
              slot_end := slot_start + (service_duration || ' minutes')::INTERVAL;
              
              -- Solo insertar slots futuros
              IF slot_start > NOW() THEN
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
                  is_reserved,
                  slot_type
                ) VALUES (
                  p_provider_id,
                  p_listing_id,
                  iter_date,
                  local_slot_start,
                  local_slot_start + (service_duration || ' minutes')::INTERVAL,
                  slot_start,
                  slot_end,
                  true,
                  false,
                  'generated'
                ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
                
                GET DIAGNOSTICS row_count_var = ROW_COUNT;
                slots_created := slots_created + row_count_var;
                debug_day_slots := debug_day_slots + row_count_var;
                
                IF row_count_var > 0 THEN
                  RAISE LOG 'Creado slot en % a las % (día: %)', iter_date, local_slot_start, day_name;
                END IF;
              END IF;
              
              -- Avanzar al siguiente slot
              local_slot_start := local_slot_start + (service_duration || ' minutes')::INTERVAL;
            END LOOP;
          END LOOP;
          
          -- Debug específico para viernes
          IF day_name = 'friday' THEN
            RAISE LOG 'VIERNES %: se crearon % slots en total', iter_date, debug_day_slots;
          END IF;
        ELSE
          RAISE LOG 'Día % no habilitado en configuración', day_name;
        END IF;
      ELSE
        RAISE LOG 'No se encontró availability para el día % (buscando clave: %)', day_name, day_name;
        -- Debug adicional para ver las claves disponibles
        RAISE LOG 'Claves disponibles en availability: %', (SELECT string_agg(key, ', ') FROM jsonb_object_keys(availability_data) key);
      END IF;
    EXCEPTION WHEN others THEN
      RAISE LOG 'Error procesando día %: % (SQLSTATE: %)', day_name, SQLERRM, SQLSTATE;
    END;
    
    iter_date := iter_date + 1;
  END LOOP;
  
  RAISE LOG 'Total de slots creados: %', slots_created;
  RETURN slots_created;
END;
$function$;

-- 3. Function to validate and monitor slot generation
CREATE OR REPLACE FUNCTION public.validate_provider_slots_coverage(p_provider_id uuid, p_listing_id uuid)
 RETURNS TABLE(
   day_name text, 
   expected_enabled boolean, 
   has_slots boolean, 
   slots_count bigint,
   missing_slots boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  availability_data JSONB;
  day_config JSONB;
  day_names TEXT[] := ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  current_day TEXT;
  day_num INTEGER;
  check_date DATE;
BEGIN
  -- Get availability configuration
  SELECT availability INTO availability_data
  FROM listings 
  WHERE id = p_listing_id AND provider_id = p_provider_id;
  
  IF availability_data IS NULL THEN
    RAISE EXCEPTION 'No availability found for listing %', p_listing_id;
  END IF;
  
  -- Check each day of the week for the next 7 days
  FOR i IN 1..7 LOOP
    check_date := CURRENT_DATE + (i - 1);
    day_num := EXTRACT(DOW FROM check_date);
    current_day := day_names[day_num + 1]; -- Arrays are 1-indexed
    
    day_config := availability_data->current_day;
    
    RETURN QUERY
    SELECT 
      current_day::text,
      COALESCE((day_config->>'enabled')::boolean, false) as expected_enabled,
      EXISTS(
        SELECT 1 FROM provider_time_slots 
        WHERE provider_id = p_provider_id 
        AND listing_id = p_listing_id 
        AND slot_date = check_date
      ) as has_slots,
      COALESCE((
        SELECT COUNT(*) FROM provider_time_slots 
        WHERE provider_id = p_provider_id 
        AND listing_id = p_listing_id 
        AND slot_date = check_date
      ), 0) as slots_count,
      (
        COALESCE((day_config->>'enabled')::boolean, false) = true AND
        NOT EXISTS(
          SELECT 1 FROM provider_time_slots 
          WHERE provider_id = p_provider_id 
          AND listing_id = p_listing_id 
          AND slot_date = check_date
        )
      ) as missing_slots;
  END LOOP;
END;
$function$;

-- 4. Function to auto-fix missing slots
CREATE OR REPLACE FUNCTION public.fix_missing_slots_for_provider(p_provider_id uuid, p_listing_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  missing_days_count INTEGER;
  slots_generated INTEGER;
BEGIN
  -- Count days with missing slots
  SELECT COUNT(*) INTO missing_days_count
  FROM validate_provider_slots_coverage(p_provider_id, p_listing_id)
  WHERE missing_slots = true;
  
  IF missing_days_count > 0 THEN
    RAISE LOG 'Found % days with missing slots for provider % listing %', 
      missing_days_count, p_provider_id, p_listing_id;
    
    -- Regenerate slots
    SELECT generate_provider_time_slots_for_listing(p_provider_id, p_listing_id, 2) INTO slots_generated;
    
    RAISE LOG 'Generated % new slots to fix missing coverage', slots_generated;
    RETURN slots_generated;
  ELSE
    RAISE LOG 'No missing slots found for provider % listing %', p_provider_id, p_listing_id;
    RETURN 0;
  END IF;
END;
$function$;

-- 5. Now regenerate slots for the affected provider/listing
SELECT generate_provider_time_slots_for_listing(
  '44e1c769-71f0-47db-add1-38af3fbe1595', 
  'f8e8554c-a1a3-4163-913f-dbf99d0cd812', 
  4
);

-- 6. Validate the fix
SELECT * FROM validate_provider_slots_coverage(
  '44e1c769-71f0-47db-add1-38af3fbe1595', 
  'f8e8554c-a1a3-4163-913f-dbf99d0cd812'
);

-- 7. Log completion
DO $$
BEGIN
  RAISE LOG 'Friday slots fix completed. Enhanced slot generation function with better validation and monitoring.';
END $$;