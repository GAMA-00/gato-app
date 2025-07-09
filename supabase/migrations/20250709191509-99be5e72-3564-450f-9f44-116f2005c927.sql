-- Fix the recurring instance generation functions 
DROP FUNCTION IF EXISTS public.generate_recurring_appointment_instances(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.generate_recurring_instances(uuid, date, date) CASCADE;

CREATE OR REPLACE FUNCTION public.generate_recurring_appointment_instances(p_rule_id uuid, p_weeks_ahead integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  rule_record recurring_rules%ROWTYPE;
  start_date_calc DATE;
  end_date_calc DATE;
  next_occurrence DATE;
  instance_count INTEGER := 0;
  start_datetime TIMESTAMP WITH TIME ZONE;
  end_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obtener la regla de recurrencia
  SELECT * INTO rule_record 
  FROM recurring_rules 
  WHERE id = p_rule_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Establecer fechas límite
  start_date_calc := GREATEST(rule_record.start_date, CURRENT_DATE);
  end_date_calc := start_date_calc + (p_weeks_ahead * 7);
  
  -- Buscar la primera ocurrencia válida
  next_occurrence := start_date_calc;
  
  WHILE next_occurrence <= end_date_calc LOOP
    -- Calcular la siguiente ocurrencia según el tipo de recurrencia
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN
        -- Encontrar el próximo día de la semana correcto - FIX EXTRACT ISSUE
        WHILE EXTRACT(DOW FROM next_occurrence::TIMESTAMP)::INTEGER != rule_record.day_of_week LOOP
          next_occurrence := next_occurrence + 1;
        END LOOP;
        
      WHEN 'biweekly' THEN
        -- Encontrar el próximo día correcto cada 2 semanas - FIX EXTRACT ISSUE
        WHILE EXTRACT(DOW FROM next_occurrence::TIMESTAMP)::INTEGER != rule_record.day_of_week OR
              EXTRACT(DAYS FROM next_occurrence - rule_record.start_date)::INTEGER % 14 != 0 LOOP
          next_occurrence := next_occurrence + 1;
          -- Evitar bucle infinito
          IF next_occurrence > end_date_calc THEN
            EXIT;
          END IF;
        END LOOP;
        
      WHEN 'monthly' THEN
        -- Mismo día del mes - FIX EXTRACT ISSUE
        WHILE EXTRACT(DAY FROM next_occurrence::TIMESTAMP)::INTEGER != rule_record.day_of_month LOOP
          next_occurrence := next_occurrence + 1;
          -- Si pasamos al siguiente mes, ajustar - FIX EXTRACT ISSUE
          IF EXTRACT(DAY FROM next_occurrence::TIMESTAMP)::INTEGER < EXTRACT(DAY FROM (next_occurrence - 1)::TIMESTAMP)::INTEGER THEN
            next_occurrence := DATE_TRUNC('month', next_occurrence) + 
                             (rule_record.day_of_month - 1) * INTERVAL '1 day';
          END IF;
          -- Evitar bucle infinito
          IF next_occurrence > end_date_calc THEN
            EXIT;
          END IF;
        END LOOP;
    END CASE;
    
    -- Salir si excedemos el límite
    IF next_occurrence > end_date_calc THEN
      EXIT;
    END IF;
    
    -- Crear timestamp completo
    start_datetime := next_occurrence + rule_record.start_time;
    end_datetime := next_occurrence + rule_record.end_time;
    
    -- Verificar que no haya conflictos con citas existentes
    IF NOT EXISTS (
      SELECT 1 FROM appointments 
      WHERE provider_id = rule_record.provider_id
      AND start_time < end_datetime 
      AND end_time > start_datetime
      AND status NOT IN ('cancelled', 'rejected')
    ) AND NOT EXISTS (
      SELECT 1 FROM recurring_appointment_instances rai
      JOIN recurring_rules rr ON rai.recurring_rule_id = rr.id
      WHERE rr.provider_id = rule_record.provider_id
      AND rai.start_time < end_datetime 
      AND rai.end_time > start_datetime
      AND rai.status NOT IN ('cancelled', 'rejected')
      AND rai.recurring_rule_id != p_rule_id
    ) THEN
      -- Insertar la instancia
      INSERT INTO recurring_appointment_instances (
        recurring_rule_id,
        instance_date,
        start_time,
        end_time,
        status,
        notes
      ) VALUES (
        p_rule_id,
        next_occurrence,
        start_datetime,
        end_datetime,
        'scheduled',
        rule_record.notes
      ) ON CONFLICT (recurring_rule_id, instance_date) DO NOTHING;
      
      GET DIAGNOSTICS instance_count = ROW_COUNT;
      IF instance_count > 0 THEN
        instance_count := instance_count + 1;
      END IF;
    END IF;
    
    -- Avanzar a la siguiente fecha según el patrón
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN
        next_occurrence := next_occurrence + 7;
      WHEN 'biweekly' THEN
        next_occurrence := next_occurrence + 14;
      WHEN 'monthly' THEN
        next_occurrence := next_occurrence + 30; -- Aproximado para buscar el siguiente mes
    END CASE;
  END LOOP;
  
  RETURN instance_count;
END;
$function$;