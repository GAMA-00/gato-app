-- Fase 1: Limpiar regla huérfana de Vicente y datos incorrectos

-- 1. Desactivar manualmente la regla de Vicente (huérfana sin recurring_rule_id en citas)
UPDATE recurring_rules 
SET is_active = false, updated_at = now()
WHERE id = '31114dca-8728-4284-8591-c7118f2c2450' -- Vicente's rule
  AND is_active = true;

-- 2. Desactivar cualquier otra regla huérfana (reglas sin citas activas asociadas)
UPDATE recurring_rules 
SET is_active = false, updated_at = now()
WHERE is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.recurring_rule_id = recurring_rules.id 
    AND a.status IN ('pending', 'confirmed')
  );

-- 3. Eliminar todas las instancias recurrentes existentes para regenerar limpiamente
DELETE FROM recurring_appointment_instances
WHERE instance_date >= CURRENT_DATE;

-- 4. Forzar regeneración de instancias para reglas activas
-- Esto se hará a través de la función existente, pero primero limpiamos todo

-- 5. Verificar y corregir horarios UTC si es necesario
-- Detectar reglas con horarios que parecen estar en UTC (13:00 local = 19:00 UTC)
UPDATE recurring_rules 
SET 
  start_time = start_time - INTERVAL '6 hours',
  end_time = end_time - INTERVAL '6 hours',
  updated_at = now()
WHERE start_time >= '19:00:00'::time 
  AND start_time <= '23:59:59'::time
  AND is_active = true;

-- 6. Log de resultados
DO $$
DECLARE
  vicente_rule_deactivated INTEGER;
  orphaned_rules_deactivated INTEGER;
  instances_deleted INTEGER;
  timezone_corrected INTEGER;
BEGIN
  -- Verificar si se desactivó la regla de Vicente
  SELECT COUNT(*) INTO vicente_rule_deactivated
  FROM recurring_rules 
  WHERE id = '31114dca-8728-4284-8591-c7118f2c2450' 
    AND is_active = false;
  
  -- Contar reglas huérfanas desactivadas
  SELECT COUNT(*) INTO orphaned_rules_deactivated
  FROM recurring_rules 
  WHERE is_active = false 
    AND updated_at > now() - INTERVAL '2 minutes';
  
  -- Contar horarios corregidos
  SELECT COUNT(*) INTO timezone_corrected
  FROM recurring_rules 
  WHERE updated_at > now() - INTERVAL '2 minutes' 
    AND is_active = true;
  
  RAISE LOG 'Limpieza completada: Vicente desactivado: %, Reglas huérfanas: %, Horarios corregidos: %', 
    vicente_rule_deactivated, orphaned_rules_deactivated, timezone_corrected;
END $$;