-- Corregir la función calculate_next_occurrence_sql para respetar el día de la semana original
CREATE OR REPLACE FUNCTION calculate_next_occurrence_sql(
  original_date DATE,
  recurrence_type TEXT,
  reference_date DATE
)
RETURNS DATE
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  target_dow INTEGER;
  next_date DATE;
  days_until_target INTEGER;
  weeks_diff INTEGER;
BEGIN
  -- Obtener el día de la semana original (0=domingo, 6=sábado)
  target_dow := EXTRACT(DOW FROM original_date)::INTEGER;
  
  CASE recurrence_type
    WHEN 'weekly' THEN
      -- Calcular días hasta el próximo día objetivo
      days_until_target := (target_dow - EXTRACT(DOW FROM reference_date)::INTEGER + 7) % 7;
      -- Si es el mismo día, ir a la próxima semana
      IF days_until_target = 0 THEN
        days_until_target := 7;
      END IF;
      RETURN reference_date + days_until_target;
      
    WHEN 'biweekly' THEN
      -- Encontrar el próximo día correcto de la semana
      days_until_target := (target_dow - EXTRACT(DOW FROM reference_date)::INTEGER + 7) % 7;
      IF days_until_target = 0 THEN
        days_until_target := 7;
      END IF;
      next_date := reference_date + days_until_target;
      -- Calcular semanas desde el original y asegurar múltiplo de 2
      weeks_diff := ((next_date - original_date) / 7)::INTEGER;
      IF weeks_diff % 2 != 0 THEN
        next_date := next_date + 7;
      END IF;
      RETURN next_date;
      
    WHEN 'triweekly' THEN
      days_until_target := (target_dow - EXTRACT(DOW FROM reference_date)::INTEGER + 7) % 7;
      IF days_until_target = 0 THEN
        days_until_target := 7;
      END IF;
      next_date := reference_date + days_until_target;
      weeks_diff := ((next_date - original_date) / 7)::INTEGER;
      WHILE weeks_diff % 3 != 0 LOOP
        next_date := next_date + 7;
        weeks_diff := ((next_date - original_date) / 7)::INTEGER;
      END LOOP;
      RETURN next_date;
      
    WHEN 'monthly' THEN
      -- Mismo día del mes en el próximo mes
      next_date := (DATE_TRUNC('month', reference_date) + INTERVAL '1 month' + 
                   (EXTRACT(DAY FROM original_date) - 1) * INTERVAL '1 day')::DATE;
      -- Si aún no hemos pasado el día este mes, usar este mes
      IF EXTRACT(DAY FROM reference_date) < EXTRACT(DAY FROM original_date) THEN
        next_date := (DATE_TRUNC('month', reference_date) + 
                     (EXTRACT(DAY FROM original_date) - 1) * INTERVAL '1 day')::DATE;
      END IF;
      RETURN next_date;
      
    ELSE
      RETURN reference_date;
  END CASE;
END;
$$;