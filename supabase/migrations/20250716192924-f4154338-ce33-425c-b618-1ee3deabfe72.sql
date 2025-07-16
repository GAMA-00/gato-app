-- Eliminar todo el contenido de la base de datos
-- ATENCIÓN: Esta operación eliminará TODOS los datos

-- Eliminar appointments y datos relacionados
DELETE FROM recurring_exceptions;
DELETE FROM recurring_appointment_instances;
DELETE FROM recurring_instances;
DELETE FROM recurring_rules;
DELETE FROM provider_ratings;
DELETE FROM post_payment_evidence;
DELETE FROM price_history;
DELETE FROM appointments;

-- Eliminar slots de tiempo
DELETE FROM provider_time_slots;

-- Eliminar disponibilidad de proveedores
DELETE FROM provider_availability;

-- Eliminar listings y datos relacionados
DELETE FROM listing_residencias;
DELETE FROM listings;

-- Eliminar relaciones de proveedores
DELETE FROM provider_residencias;

-- Eliminar miembros de equipo
DELETE FROM team_members;

-- Eliminar métodos de pago
DELETE FROM payment_methods;

-- Eliminar usuarios de la tabla users
DELETE FROM users;

-- Reiniciar secuencias si las hay (opcional)
-- Las UUIDs no necesitan reinicio, pero por completitud:
-- ALTER SEQUENCE IF EXISTS some_sequence_name RESTART WITH 1;

-- Mensaje de confirmación
SELECT 'Base de datos limpiada completamente' as mensaje;