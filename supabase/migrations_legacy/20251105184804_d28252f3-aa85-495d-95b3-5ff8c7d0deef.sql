-- Eliminar todas las citas con recurrence='daily'
DELETE FROM appointments WHERE recurrence = 'daily';

-- Eliminar recurring_rules de tipo daily (si existen)
DELETE FROM recurring_rules WHERE recurrence_type = 'daily';

-- Eliminar recurring_instances relacionadas con daily
DELETE FROM recurring_appointment_instances 
WHERE recurring_rule_id IN (
  SELECT id FROM recurring_rules WHERE recurrence_type = 'daily'
);

-- Verificación: contar citas daily restantes (debe ser 0)
DO $$
DECLARE
  daily_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO daily_count FROM appointments WHERE recurrence = 'daily';
  RAISE NOTICE 'Remaining daily appointments: %', daily_count;
END $$;