-- Optimización de índices duplicados (Opción A - Conservadora)
-- Elimina índices duplicados exactos manteniendo los más descriptivos
-- y preservando todas las restricciones UNIQUE necesarias

-- 1. Tabla appointments
-- Eliminamos idx_appointments_provider_status (duplicado)
-- Mantenemos idx_appointments_provider_status_time (más descriptivo)
DROP INDEX IF EXISTS idx_appointments_provider_status;

-- 2. Tabla onvopay_customers
-- Eliminamos versiones cortas de nombres, mantenemos las descriptivas
DROP INDEX IF EXISTS idx_onvopay_customers_norm_email;
DROP INDEX IF EXISTS idx_onvopay_customers_norm_phone;

-- Eliminamos índices redundantes de client_id, mantenemos UNIQUE constraint
DROP INDEX IF EXISTS idx_onvopay_customers_client_id;
DROP INDEX IF EXISTS idx_onvopay_customers_client_id_unique;

-- Eliminamos índice no-unique de onvopay_id, mantenemos UNIQUE constraint
DROP INDEX IF EXISTS idx_onvopay_customers_onvopay_id;

-- 3. Tabla provider_ratings
-- Eliminamos índice custom, mantenemos el constraint del sistema
DROP INDEX IF EXISTS idx_provider_ratings_appointment_unique;

-- Índices mantenidos:
-- ✅ idx_appointments_provider_status_time (appointments)
-- ✅ idx_onvopay_customers_normalized_email (onvopay_customers)
-- ✅ idx_onvopay_customers_normalized_phone (onvopay_customers)
-- ✅ uq_onvopay_customers_client_id (UNIQUE - onvopay_customers)
-- ✅ uq_onvopay_customers_onvopay_id (UNIQUE - onvopay_customers)
-- ✅ idx_onvopay_customers_lookup (compuesto - onvopay_customers)
-- ✅ provider_ratings_appointment_id_key (UNIQUE - provider_ratings)