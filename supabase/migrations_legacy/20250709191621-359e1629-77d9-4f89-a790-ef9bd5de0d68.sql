-- Recreate missing functions and triggers
CREATE OR REPLACE FUNCTION public.generate_recurring_instances(rule_id uuid, start_range date, end_range date)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  rule_record recurring_rules%ROWTYPE;
  iter_date DATE;
  instance_count INTEGER := 0;
  next_occurrence DATE;
BEGIN
  -- Obtener la regla de recurrencia
  SELECT * INTO rule_record FROM recurring_rules WHERE id = rule_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  iter_date := GREATEST(rule_record.start_date, start_range);
  
  WHILE iter_date <= end_range LOOP
    -- Calcular la siguiente ocurrencia basada en el tipo de recurrencia - FIX EXTRACT ISSUE
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN
        -- Encontrar el próximo día de la semana
        next_occurrence := iter_date + (rule_record.day_of_week - EXTRACT(DOW FROM iter_date::TIMESTAMP)::INTEGER + 7) % 7;
        IF next_occurrence < iter_date THEN
          next_occurrence := next_occurrence + INTERVAL '7 days';
        END IF;
        
      WHEN 'biweekly' THEN
        -- Similar a semanal pero cada 2 semanas
        next_occurrence := iter_date + (rule_record.day_of_week - EXTRACT(DOW FROM iter_date::TIMESTAMP)::INTEGER + 7) % 7;
        IF next_occurrence < iter_date THEN
          next_occurrence := next_occurrence + INTERVAL '7 days';
        END IF;
        -- Verificar que sea en la semana correcta (cada 2 semanas desde start_date)
        WHILE EXTRACT(DAYS FROM next_occurrence - rule_record.start_date)::INTEGER % 14 != 0 LOOP
          next_occurrence := next_occurrence + INTERVAL '7 days';
        END LOOP;
        
      WHEN 'monthly' THEN
        -- Mismo día del mes
        next_occurrence := DATE_TRUNC('month', iter_date) + (rule_record.day_of_month - 1) * INTERVAL '1 day';
        IF next_occurrence < iter_date THEN
          next_occurrence := DATE_TRUNC('month', iter_date + INTERVAL '1 month') + (rule_record.day_of_month - 1) * INTERVAL '1 day';
        END IF;
    END CASE;
    
    EXIT WHEN next_occurrence > end_range;
    
    -- Insertar la instancia si no existe
    INSERT INTO recurring_instances (
      recurring_rule_id,
      instance_date,
      start_time,
      end_time
    ) VALUES (
      rule_id,
      next_occurrence,
      next_occurrence + rule_record.start_time,
      next_occurrence + rule_record.end_time
    ) ON CONFLICT (recurring_rule_id, instance_date) DO NOTHING;
    
    GET DIAGNOSTICS instance_count = ROW_COUNT;
    IF instance_count > 0 THEN
      instance_count := instance_count + 1;
    END IF;
    
    -- Avanzar a la siguiente posible fecha
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN
        iter_date := next_occurrence + INTERVAL '7 days';
      WHEN 'biweekly' THEN
        iter_date := next_occurrence + INTERVAL '14 days';
      WHEN 'monthly' THEN
        iter_date := next_occurrence + INTERVAL '1 month';
    END CASE;
  END LOOP;
  
  RETURN instance_count;
END;
$function$;

-- Recreate auto-trigger for recurring rules
CREATE OR REPLACE FUNCTION public.auto_generate_recurring_instances()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Solo generar para reglas activas y recurrentes
  IF NEW.is_active = true AND NEW.recurrence_type IN ('weekly', 'biweekly', 'monthly') THEN
    PERFORM generate_recurring_appointment_instances(NEW.id, 10);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-generating recurring instances
CREATE OR REPLACE TRIGGER auto_generate_recurring_instances_trigger
    AFTER INSERT OR UPDATE ON recurring_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_recurring_instances();