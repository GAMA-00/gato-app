
-- Crear tabla para instancias de citas recurrentes
CREATE TABLE IF NOT EXISTS public.recurring_appointment_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_rule_id UUID NOT NULL REFERENCES public.recurring_rules(id) ON DELETE CASCADE,
  instance_date DATE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(recurring_rule_id, instance_date)
);

-- Habilitar RLS
ALTER TABLE public.recurring_appointment_instances ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para recurring_appointment_instances
CREATE POLICY "Providers can view their recurring instances" 
  ON public.recurring_appointment_instances 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.recurring_rules 
      WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id 
      AND recurring_rules.provider_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their recurring instances" 
  ON public.recurring_appointment_instances 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.recurring_rules 
      WHERE recurring_rules.id = recurring_appointment_instances.recurring_rule_id 
      AND recurring_rules.client_id = auth.uid()
    )
  );

-- Función para generar instancias recurrentes automáticamente
CREATE OR REPLACE FUNCTION public.generate_recurring_appointment_instances(
  p_rule_id UUID,
  p_weeks_ahead INTEGER DEFAULT 10
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
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
        -- Encontrar el próximo día de la semana correcto
        WHILE EXTRACT(DOW FROM next_occurrence)::INTEGER != rule_record.day_of_week LOOP
          next_occurrence := next_occurrence + 1;
        END LOOP;
        
      WHEN 'biweekly' THEN
        -- Encontrar el próximo día correcto cada 2 semanas
        WHILE EXTRACT(DOW FROM next_occurrence)::INTEGER != rule_record.day_of_week OR
              EXTRACT(DAYS FROM next_occurrence - rule_record.start_date) % 14 != 0 LOOP
          next_occurrence := next_occurrence + 1;
          -- Evitar bucle infinito
          IF next_occurrence > end_date_calc THEN
            EXIT;
          END IF;
        END LOOP;
        
      WHEN 'monthly' THEN
        -- Mismo día del mes
        WHILE EXTRACT(DAY FROM next_occurrence)::INTEGER != rule_record.day_of_month LOOP
          next_occurrence := next_occurrence + 1;
          -- Si pasamos al siguiente mes, ajustar
          IF EXTRACT(DAY FROM next_occurrence) < EXTRACT(DAY FROM next_occurrence - 1) THEN
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
$$;

-- Trigger para generar instancias automáticamente cuando se crea una regla recurrente
CREATE OR REPLACE FUNCTION public.auto_generate_recurring_instances()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo generar para reglas activas y recurrentes
  IF NEW.is_active = true AND NEW.recurrence_type IN ('weekly', 'biweekly', 'monthly') THEN
    PERFORM generate_recurring_appointment_instances(NEW.id, 10);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_recurring_instances ON recurring_rules;
CREATE TRIGGER trigger_auto_generate_recurring_instances
  AFTER INSERT ON recurring_rules
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_recurring_instances();

-- Función para extender instancias recurrentes cuando se acercan al límite
CREATE OR REPLACE FUNCTION public.extend_recurring_instances()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  rule_record RECORD;
  extended_count INTEGER := 0;
  total_extended INTEGER := 0;
BEGIN
  -- Buscar reglas activas que necesitan extensión (menos de 3 semanas de instancias futuras)
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
