-- Eliminar el trigger redundante que causa el error de NULL listing_id
-- Los slots ya se generan correctamente desde los triggers de la tabla listings
DROP TRIGGER IF EXISTS trigger_auto_generate_slots ON provider_availability;

-- También eliminar la función huérfana que ya no se usa
DROP FUNCTION IF EXISTS public.auto_generate_slots_for_provider_availability();