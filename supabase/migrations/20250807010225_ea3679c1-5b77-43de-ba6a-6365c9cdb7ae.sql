-- Eliminar todos los appointments y datos relacionados
-- Esta migración limpia completamente el historial de citas

-- Eliminar datos relacionados con appointments (en orden para respetar foreign keys)

-- 1. Eliminar ratings de proveedores
DELETE FROM provider_ratings;

-- 2. Eliminar evidencias de pago post-servicio
DELETE FROM post_payment_evidence;

-- 3. Eliminar excepciones de citas recurrentes
DELETE FROM recurring_exceptions;

-- 4. Eliminar historial de precios
DELETE FROM price_history;

-- 5. Eliminar instancias de citas recurrentes
DELETE FROM recurring_appointment_instances;

-- 6. Eliminar instancias recurrentes (tabla alternativa)
DELETE FROM recurring_instances;

-- 7. Eliminar reglas de recurrencia
DELETE FROM recurring_rules;

-- 8. Finalmente, eliminar todos los appointments
DELETE FROM appointments;

-- 9. Opcional: Resetear las secuencias si las hay (no aplica a UUID pero limpia cualquier contador)
-- No hay secuencias que resetear ya que se usan UUIDs

-- Log de la operación
DO $$
BEGIN
  RAISE LOG 'Eliminación completa de appointments realizada. Todas las citas, historial y datos relacionados han sido borrados.';
END $$;