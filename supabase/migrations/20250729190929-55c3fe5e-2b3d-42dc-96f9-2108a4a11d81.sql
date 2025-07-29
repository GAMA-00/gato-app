-- Eliminar todos los datos de la base de datos
-- CUIDADO: Esta operación eliminará TODA la información

-- 1. Eliminar instancias y reglas de citas recurrentes
DELETE FROM recurring_appointment_instances;
DELETE FROM recurring_exceptions;
DELETE FROM recurring_rules;
DELETE FROM recurring_instances;

-- 2. Eliminar citas
DELETE FROM appointments;

-- 3. Eliminar evidencia de post-pago y historial de precios
DELETE FROM post_payment_evidence;
DELETE FROM price_history;

-- 4. Eliminar calificaciones de proveedores
DELETE FROM provider_ratings;

-- 5. Eliminar slots de tiempo de proveedores
DELETE FROM provider_time_slots;
DELETE FROM provider_slot_preferences;

-- 6. Eliminar disponibilidad de proveedores
DELETE FROM provider_availability;

-- 7. Eliminar miembros del equipo
DELETE FROM team_members;

-- 8. Eliminar asociaciones de listings con residencias
DELETE FROM listing_residencias;

-- 9. Eliminar listings (servicios)
DELETE FROM listings;

-- 10. Eliminar métodos de pago
DELETE FROM payment_methods;

-- 11. Eliminar asociaciones de proveedores con residencias
DELETE FROM provider_residencias;

-- 12. Eliminar usuarios (esto también eliminará automáticamente los perfiles de auth.users debido al trigger)
DELETE FROM users;