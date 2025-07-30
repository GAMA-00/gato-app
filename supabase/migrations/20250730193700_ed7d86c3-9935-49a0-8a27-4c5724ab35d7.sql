-- Fix remaining function search path security vulnerabilities

-- Update all functions to have secure search_path settings
CREATE OR REPLACE FUNCTION public.submit_provider_rating(p_provider_id uuid, p_client_id uuid, p_appointment_id uuid, p_rating integer, p_comment text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the rating with optional comment
  INSERT INTO provider_ratings 
    (provider_id, client_id, appointment_id, rating, comment, created_at)
  VALUES 
    (p_provider_id, p_client_id, p_appointment_id, p_rating, p_comment, now())
  ON CONFLICT (appointment_id) 
  DO UPDATE SET 
    rating = p_rating,
    comment = p_comment,
    created_at = now();
  
  -- Update provider's average rating with base 5-star logic
  -- Only count ratings from COMPLETED appointments
  WITH provider_avg AS (
    SELECT 
      (5.0 + SUM(pr.rating::numeric)) / (COUNT(*) + 1) as avg_rating,
      COUNT(*) as rating_count
    FROM provider_ratings pr
    JOIN appointments a ON pr.appointment_id = a.id
    WHERE pr.provider_id = p_provider_id
    AND a.status = 'completed'
  )
  UPDATE users
  SET average_rating = ROUND(provider_avg.avg_rating, 1)
  FROM provider_avg
  WHERE users.id = p_provider_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_rated_appointments(appointment_ids uuid[])
RETURNS TABLE(appointment_id uuid)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT provider_ratings.appointment_id
    FROM provider_ratings
    WHERE provider_ratings.appointment_id = ANY(appointment_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_slots_for_new_listing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  slots_created INTEGER;
BEGIN
  -- Solo generar slots para listings activos
  IF NEW.is_active = true THEN
    SELECT generate_provider_time_slots_for_listing(NEW.provider_id, NEW.id, 4) INTO slots_created;
    RAISE LOG 'Auto-generated % slots for new listing %', slots_created, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recurring_clients_count_by_listing(provider_id uuid, listing_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Count unique clients who have active recurring appointments for this specific listing
  RETURN (
    SELECT COUNT(DISTINCT client_id)
    FROM appointments
    WHERE provider_id = $1 
      AND listing_id = $2
      AND client_id IS NOT NULL
      AND recurrence IS NOT NULL 
      AND recurrence != 'none'
      AND recurrence != ''
      AND status IN ('pending', 'confirmed')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.extend_recurring_instances()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  rule_record RECORD;
  extended_count INTEGER := 0;
  total_extended INTEGER := 0;
BEGIN
  -- Buscar reglas activas que necesitan extensión
  FOR rule_record IN 
    SELECT rr.id 
    FROM recurring_rules rr
    WHERE rr.is_active = true 
    AND rr.recurrence_type IN ('weekly', 'biweekly', 'monthly')
    AND (
      SELECT COUNT(*) 
      FROM recurring_appointment_instances rai 
      WHERE rai.recurring_rule_id = rr.id 
      AND rai.instance_date > CURRENT_DATE 
      AND rai.status NOT IN ('cancelled', 'rejected')
    ) < 3
  LOOP
    -- Generar más instancias para esta regla
    SELECT generate_recurring_appointment_instances(rule_record.id, 10) INTO extended_count;
    total_extended := total_extended + extended_count;
  END LOOP;
  
  RETURN total_extended;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_provider_time_slots_for_listing(p_provider_id uuid, p_listing_id uuid, p_weeks_ahead integer DEFAULT 4)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  local_slot_start TIME;
BEGIN
  -- Obtener la duración del servicio
  SELECT standard_duration INTO service_duration
  FROM listings 
  WHERE id = p_listing_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'No se encontró la duración estándar para el servicio %', p_listing_id;
  END IF;
  
  RAISE LOG 'Generando slots para listing % con duración % minutos', p_listing_id, service_duration;
  
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
      
      RAISE LOG 'Procesando día % (DOW: %) con disponibilidad de % a %', 
        iter_date, availability_record.day_of_week, availability_record.start_time, availability_record.end_time;
      
      -- Calcular el último slot posible que no exceda el horario de disponibilidad
      max_slot_start := availability_record.end_time - (service_duration || ' minutes')::INTERVAL;
      
      -- Comenzar desde el inicio de la disponibilidad
      local_slot_start := availability_record.start_time;
      
      WHILE local_slot_start <= max_slot_start LOOP
        -- Crear el timestamp UTC correcto
        slot_start := (iter_date + local_slot_start) AT TIME ZONE 'America/Costa_Rica';
        slot_end := slot_start + (service_duration || ' minutes')::INTERVAL;
        
        -- Verificar que el slot termine dentro del horario de disponibilidad
        IF (local_slot_start + (service_duration || ' minutes')::INTERVAL) <= availability_record.end_time THEN
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
            local_slot_start,
            local_slot_start + (service_duration || ' minutes')::INTERVAL,
            slot_start,
            slot_end,
            true,
            false
          ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;
          
          GET DIAGNOSTICS row_count_var = ROW_COUNT;
          slots_created := slots_created + row_count_var;
          
          IF row_count_var > 0 THEN
            RAISE LOG 'Creado slot en % a las %', iter_date, local_slot_start;
          END IF;
        END IF;
        
        -- Avanzar al siguiente slot
        local_slot_start := local_slot_start + (service_duration || ' minutes')::INTERVAL;
      END LOOP;
      
    END LOOP;
    
    iter_date := iter_date + 1;
  END LOOP;
  
  RAISE LOG 'Total de slots creados: %', slots_created;
  RETURN slots_created;
END;
$$;