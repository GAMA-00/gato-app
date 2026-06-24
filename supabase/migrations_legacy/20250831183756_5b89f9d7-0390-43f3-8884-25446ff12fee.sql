-- Agregar columna para guardar la razón de cancelación
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;