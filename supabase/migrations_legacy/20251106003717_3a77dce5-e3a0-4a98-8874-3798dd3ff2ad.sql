-- Reparar citas base recurrentes que fueron marcadas como 'completed' incorrectamente
-- Esto restaura el status a 'confirmed' para que las instancias futuras puedan ser generadas

UPDATE appointments
SET status = 'confirmed'
WHERE is_recurring_instance = false
  AND recurrence IS NOT NULL
  AND recurrence NOT IN ('none', 'once')
  AND status = 'completed';

-- Agregar comentario explicativo
COMMENT ON COLUMN appointments.is_recurring_instance IS 
'false = base recurring appointment (template), true = materialized instance of a recurring series, null/false = regular one-time appointment';