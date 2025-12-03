-- Corregir la función del trigger que tiene el bug crítico
-- El problema: pasaba NULL como listing_id en lugar de NEW.id
CREATE OR REPLACE FUNCTION public.auto_generate_slots_for_new_listing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  slots_created INTEGER;
BEGIN
  -- Solo generar slots para listings activos
  IF NEW.is_active = true THEN
    -- ✅ CORREGIDO: Usar NEW.id en lugar de NULL
    SELECT generate_provider_time_slots_for_listing(NEW.provider_id, NEW.id, 4) INTO slots_created;
    RAISE LOG 'Auto-generated % slots for new listing %', slots_created, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;