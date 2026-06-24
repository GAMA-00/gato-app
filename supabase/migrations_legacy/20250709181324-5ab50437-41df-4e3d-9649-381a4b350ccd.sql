-- Fase 1: Limpiar datos incorrectos en el sistema de citas recurrentes

-- 1. Desactivar reglas recurrentes para citas que fueron canceladas/rechazadas
UPDATE recurring_rules 
SET is_active = false, updated_at = now()
WHERE id IN (
  SELECT DISTINCT rr.id
  FROM recurring_rules rr
  JOIN appointments a ON a.recurring_rule_id = rr.id
  WHERE a.status IN ('cancelled', 'rejected')
    AND rr.is_active = true
);

-- 2. Eliminar instancias recurrentes incorrectas (futuras) para reglas inactivas
DELETE FROM recurring_appointment_instances
WHERE recurring_rule_id IN (
  SELECT id FROM recurring_rules WHERE is_active = false
) AND instance_date > CURRENT_DATE;

-- 3. Corregir horarios UTC en reglas recurrentes (Costa Rica es UTC-6)
-- Detectar reglas con horarios que parecen estar en UTC cuando deberían estar en local
-- Si start_time está entre 19:00-23:59, probablemente sea UTC de horario local 13:00-17:59
UPDATE recurring_rules 
SET 
  start_time = start_time - INTERVAL '6 hours',
  end_time = end_time - INTERVAL '6 hours',
  updated_at = now()
WHERE start_time >= '19:00:00'::time 
  AND start_time <= '23:59:59'::time
  AND is_active = true;

-- 4. Eliminar instancias recurrentes existentes que puedan estar incorrectas
-- Para regenerarlas con la lógica corregida
DELETE FROM recurring_appointment_instances
WHERE instance_date >= CURRENT_DATE
  AND recurring_rule_id IN (
    SELECT id FROM recurring_rules WHERE is_active = true
  );

-- 5. Log de cambios realizados
DO $$
DECLARE
  deactivated_rules INTEGER;
  deleted_instances INTEGER;
  corrected_times INTEGER;
BEGIN
  -- Contar reglas desactivadas
  SELECT COUNT(*) INTO deactivated_rules
  FROM recurring_rules 
  WHERE is_active = false AND updated_at > now() - INTERVAL '1 minute';
  
  -- Contar instancias eliminadas sería más complejo ya que ya se eliminaron
  -- Contar horarios corregidos
  SELECT COUNT(*) INTO corrected_times
  FROM recurring_rules 
  WHERE updated_at > now() - INTERVAL '1 minute' AND is_active = true;
  
  RAISE LOG 'Limpieza completada: % reglas desactivadas, % horarios corregidos', 
    deactivated_rules, corrected_times;
END $$;