
-- Primero, veamos exactamente qué duplicados tenemos
-- Eliminar todas las calificaciones de citas que tienen duplicados
DELETE FROM provider_ratings 
WHERE appointment_id IN (
  SELECT id 
  FROM appointments a1
  WHERE EXISTS (
    SELECT 1 
    FROM appointments a2 
    WHERE a2.provider_id = a1.provider_id 
    AND a2.start_time = a1.start_time 
    AND a2.end_time = a1.end_time 
    AND a2.id != a1.id
  )
);

-- Eliminar citas duplicadas manteniendo solo la más antigua de cada grupo
-- Incluir TODOS los estados para asegurar que capturamos todos los duplicados
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY provider_id, start_time, end_time 
      ORDER BY created_at ASC
    ) as row_num
  FROM appointments
)
DELETE FROM appointments 
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Ahora crear la restricción única para prevenir futuros duplicados
ALTER TABLE appointments 
ADD CONSTRAINT unique_appointment_slot 
UNIQUE (provider_id, start_time, end_time);

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_appointments_provider_time 
ON appointments (provider_id, start_time, end_time) 
WHERE status NOT IN ('cancelled', 'rejected');
