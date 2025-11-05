-- Actualizar status de base appointments rechazados para asegurar consistencia
-- Esto garantiza que appointments rechazados no generen instancias futuras

UPDATE appointments
SET status = 'rejected'
WHERE is_recurring_instance = false
  AND recurrence IN ('weekly', 'biweekly', 'triweekly', 'monthly')
  AND status = 'rejected';

-- Verificar que no haya appointments diarios restantes
SELECT COUNT(*) as daily_appointments_remaining
FROM appointments
WHERE recurrence = 'daily';

-- Log de verificación
DO $$
DECLARE
  rejected_count INTEGER;
  daily_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rejected_count
  FROM appointments
  WHERE is_recurring_instance = false
    AND recurrence IN ('weekly', 'biweekly', 'triweekly', 'monthly')
    AND status = 'rejected';
    
  SELECT COUNT(*) INTO daily_count
  FROM appointments
  WHERE recurrence = 'daily';
  
  RAISE NOTICE 'Base appointments rechazados actualizados: %', rejected_count;
  RAISE NOTICE 'Appointments diarios restantes: %', daily_count;
END $$;