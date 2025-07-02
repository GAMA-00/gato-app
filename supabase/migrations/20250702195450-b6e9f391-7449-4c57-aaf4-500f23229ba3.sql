-- Crear función para generar regla recurrente desde appointment
CREATE OR REPLACE FUNCTION public.create_recurring_rule_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
  day_of_week_val INTEGER;
  day_of_month_val INTEGER;
BEGIN
  -- Solo procesar si es una cita recurrente
  IF NEW.recurrence IN ('weekly', 'biweekly', 'monthly') AND NEW.is_recurring_instance = false THEN
    
    -- Calcular día de la semana (0=domingo, 1=lunes, etc.)
    day_of_week_val := EXTRACT(DOW FROM NEW.start_time);
    day_of_month_val := EXTRACT(DAY FROM NEW.start_time);
    
    -- Crear la regla recurrente correspondiente
    INSERT INTO recurring_rules (
      client_id,
      provider_id,
      listing_id,
      recurrence_type,
      start_date,
      start_time,
      end_time,
      day_of_week,
      day_of_month,
      is_active,
      client_name,
      notes,
      client_address,
      client_phone,
      client_email
    ) VALUES (
      NEW.client_id,
      NEW.provider_id,
      NEW.listing_id,
      NEW.recurrence,
      NEW.start_time::DATE,
      NEW.start_time::TIME,
      NEW.end_time::TIME,
      CASE 
        WHEN NEW.recurrence IN ('weekly', 'biweekly') THEN day_of_week_val
        ELSE NULL
      END,
      CASE 
        WHEN NEW.recurrence = 'monthly' THEN day_of_month_val
        ELSE NULL
      END,
      true,
      NEW.client_name,
      NEW.notes,
      NEW.client_address,
      NEW.client_phone,
      NEW.client_email
    );
    
    -- Actualizar el appointment con el recurring_rule_id
    UPDATE appointments 
    SET recurring_rule_id = (
      SELECT id FROM recurring_rules 
      WHERE client_id = NEW.client_id 
        AND provider_id = NEW.provider_id 
        AND listing_id = NEW.listing_id
        AND start_time = NEW.start_time::TIME
      ORDER BY created_at DESC 
      LIMIT 1
    )
    WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para aplicar automáticamente
DROP TRIGGER IF EXISTS trigger_create_recurring_rule ON appointments;
CREATE TRIGGER trigger_create_recurring_rule
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION create_recurring_rule_from_appointment();