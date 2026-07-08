-- Agregar campos para soporte de citas recurrentes en slots
ALTER TABLE provider_time_slots 
ADD COLUMN recurring_blocked BOOLEAN DEFAULT false,
ADD COLUMN recurring_rule_id UUID REFERENCES recurring_rules(id) ON DELETE SET NULL,
ADD COLUMN blocked_until DATE;

-- Crear índice para optimizar consultas de slots bloqueados
CREATE INDEX idx_provider_time_slots_recurring ON provider_time_slots(provider_id, recurring_blocked, slot_date);

-- Crear función para bloquear slots recurrentes automáticamente
CREATE OR REPLACE FUNCTION block_recurring_slots(
  p_recurring_rule_id UUID,
  p_months_ahead INTEGER DEFAULT 12
) RETURNS INTEGER AS $$
DECLARE
  rule_record recurring_rules%ROWTYPE;
  slots_blocked INTEGER := 0;
  current_date DATE;
  end_date DATE;
  slot_start_time TIME;
  slot_end_time TIME;
  slot_start_datetime TIMESTAMP WITH TIME ZONE;
  slot_end_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obtener la regla de recurrencia
  SELECT * INTO rule_record FROM recurring_rules WHERE id = p_recurring_rule_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring rule not found or inactive: %', p_recurring_rule_id;
  END IF;
  
  -- Establecer rango de fechas (próximos 12 meses por defecto)
  current_date := GREATEST(rule_record.start_date, CURRENT_DATE);
  end_date := current_date + (p_months_ahead * 30); -- Aproximadamente 12 meses
  
  -- Iterar por fechas según el tipo de recurrencia
  WHILE current_date <= end_date LOOP
    DECLARE
      should_block BOOLEAN := false;
    BEGIN
      -- Determinar si esta fecha debe tener un slot bloqueado
      CASE rule_record.recurrence_type
        WHEN 'weekly' THEN
          IF EXTRACT(DOW FROM current_date::TIMESTAMP)::INTEGER = rule_record.day_of_week THEN
            should_block := true;
          END IF;
        WHEN 'biweekly' THEN
          IF EXTRACT(DOW FROM current_date::TIMESTAMP)::INTEGER = rule_record.day_of_week AND
             EXTRACT(DAYS FROM current_date - rule_record.start_date)::INTEGER % 14 = 0 THEN
            should_block := true;
          END IF;
        WHEN 'monthly' THEN
          IF EXTRACT(DAY FROM current_date::TIMESTAMP)::INTEGER = rule_record.day_of_month THEN
            should_block := true;
          END IF;
      END CASE;
      
      -- Si debe bloquear, crear el slot si no existe y marcarlo como bloqueado
      IF should_block THEN
        slot_start_time := rule_record.start_time;
        slot_end_time := rule_record.end_time;
        slot_start_datetime := current_date + slot_start_time;
        slot_end_datetime := current_date + slot_end_time;
        
        -- Insertar o actualizar el slot
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
          recurring_blocked,
          recurring_rule_id,
          blocked_until
        ) VALUES (
          rule_record.provider_id,
          rule_record.listing_id,
          current_date,
          slot_start_time,
          slot_end_time,
          slot_start_datetime,
          slot_end_datetime,
          false, -- No disponible porque está bloqueado
          true,  -- Marcado como reservado
          true,  -- Bloqueado por recurrencia
          p_recurring_rule_id,
          end_date
        ) ON CONFLICT (provider_id, listing_id, slot_datetime_start) 
        DO UPDATE SET
          is_available = false,
          is_reserved = true,
          recurring_blocked = true,
          recurring_rule_id = p_recurring_rule_id,
          blocked_until = end_date;
        
        slots_blocked := slots_blocked + 1;
      END IF;
    END;
    
    -- Avanzar a la siguiente fecha según el tipo de recurrencia
    CASE rule_record.recurrence_type
      WHEN 'weekly' THEN
        current_date := current_date + 7;
      WHEN 'biweekly' THEN
        current_date := current_date + 14;
      WHEN 'monthly' THEN
        current_date := current_date + 30; -- Aproximación para encontrar el siguiente mes
    END CASE;
  END LOOP;
  
  RETURN slots_blocked;
END;
$$ LANGUAGE plpgsql;

-- Crear función para liberar slots recurrentes
CREATE OR REPLACE FUNCTION unblock_recurring_slots(p_recurring_rule_id UUID) 
RETURNS INTEGER AS $$
DECLARE
  slots_unblocked INTEGER;
BEGIN
  UPDATE provider_time_slots 
  SET 
    is_available = true,
    is_reserved = false,
    recurring_blocked = false,
    recurring_rule_id = NULL,
    blocked_until = NULL
  WHERE recurring_rule_id = p_recurring_rule_id;
  
  GET DIAGNOSTICS slots_unblocked = ROW_COUNT;
  RETURN slots_unblocked;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para bloquear slots automáticamente cuando se crea una regla recurrente
CREATE OR REPLACE FUNCTION auto_block_recurring_slots()
RETURNS TRIGGER AS $$
DECLARE
  slots_created INTEGER;
BEGIN
  -- Solo bloquear slots para nuevas reglas activas
  IF NEW.is_active = true AND NEW.recurrence_type IN ('weekly', 'biweekly', 'monthly') THEN
    -- Bloquear slots para los próximos 12 meses
    SELECT block_recurring_slots(NEW.id, 12) INTO slots_created;
    RAISE LOG 'Auto-blocked % slots for recurring rule %', slots_created, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
CREATE TRIGGER auto_block_recurring_slots_trigger
  AFTER INSERT ON recurring_rules
  FOR EACH ROW
  EXECUTE FUNCTION auto_block_recurring_slots();

-- Crear trigger para liberar slots cuando se desactiva una regla
CREATE OR REPLACE FUNCTION auto_unblock_recurring_slots()
RETURNS TRIGGER AS $$
DECLARE
  slots_unblocked INTEGER;
BEGIN
  -- Si la regla se desactiva, liberar todos sus slots
  IF OLD.is_active = true AND NEW.is_active = false THEN
    SELECT unblock_recurring_slots(NEW.id) INTO slots_unblocked;
    RAISE LOG 'Auto-unblocked % slots for deactivated rule %', slots_unblocked, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger para desactivación
CREATE TRIGGER auto_unblock_recurring_slots_trigger
  AFTER UPDATE ON recurring_rules
  FOR EACH ROW
  EXECUTE FUNCTION auto_unblock_recurring_slots();