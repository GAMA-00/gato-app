
-- Verificar la restricción actual de status en la tabla appointments
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'appointments'::regclass 
AND conname = 'appointments_status_check';

-- Si necesitamos actualizar la restricción para incluir 'rescheduled', lo haremos
-- Primero eliminamos la restricción existente
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Creamos la nueva restricción que incluye todos los estados necesarios
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'rescheduled'));
