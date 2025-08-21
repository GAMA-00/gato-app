
  -- 1) Función para sincronizar provider_availability desde el availability del listing
CREATE OR REPLACE FUNCTION public.sync_provider_availability_from_listing(p_listing_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_id uuid;
  v_availability jsonb;
  v_inserted integer := 0;
BEGIN
  -- Obtener provider y availability del listing
  SELECT provider_id, availability::jsonb
  INTO v_provider_id, v_availability
  FROM listings
  WHERE id = p_listing_id;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Listing % no existe o no tiene provider_id', p_listing_id;
  END IF;

  -- Si no hay availability, limpiar y salir
  IF v_availability IS NULL OR v_availability = '{}'::jsonb THEN
    DELETE FROM provider_availability WHERE provider_id = v_provider_id;
    RETURN 0;
  END IF;

  -- Limpiar disponibilidad previa del proveedor
  DELETE FROM provider_availability
  WHERE provider_id = v_provider_id;

  -- Insertar nueva disponibilidad mapeando días
  WITH days(day_name, day_of_week) AS (
    VALUES
      ('sunday', 0),
      ('monday', 1),
      ('tuesday', 2),
      ('wednesday', 3),
      ('thursday', 4),
      ('friday', 5),
      ('saturday', 6)
  ),
  enabled_days AS (
    SELECT
      d.day_of_week,
      COALESCE((v_availability->d.day_name->>'enabled')::boolean, false) AS enabled,
      COALESCE((v_availability->d.day_name->'timeSlots')::jsonb, '[]'::jsonb) AS slots
    FROM days d
  )
  INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_active)
  SELECT
    v_provider_id,
    ed.day_of_week,
    (slot->>'startTime')::time,
    (slot->>'endTime')::time,
    true
  FROM enabled_days ed
  CROSS JOIN LATERAL jsonb_array_elements(ed.slots) AS slot
  WHERE ed.enabled = true;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- 2) Trigger function: al cambiar availability o duración en listings, sincroniza disponibilidad y regenera slots
CREATE OR REPLACE FUNCTION public.on_listings_update_sync_and_regen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_synced integer;
  v_slots integer;
BEGIN
  -- Solo actuar si cambian availability o duración
  IF (OLD.availability IS DISTINCT FROM NEW.availability)
     OR (OLD.standard_duration IS DISTINCT FROM NEW.standard_duration)
     OR (OLD.duration IS DISTINCT FROM NEW.duration) THEN

    -- Sincronizar provider_availability desde el listing
    BEGIN
      SELECT sync_provider_availability_from_listing(NEW.id) INTO v_synced;
      RAISE LOG 'Synced % availability rows for listing %', v_synced, NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error syncing provider_availability from listing %: %', NEW.id, SQLERRM;
    END;

    -- Regenerar slots de forma segura para ese listing
    BEGIN
      SELECT regenerate_slots_for_listing(NEW.id) INTO v_slots;
      RAISE LOG 'Regenerated % slots for listing %', v_slots, NEW.id;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback: intentar la versión "safe" si existe
      BEGIN
        PERFORM public.regenerate_slots_for_listing_safe(NEW.id);
        RAISE LOG 'Called regenerate_slots_for_listing_safe for listing %', NEW.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error regenerating slots for listing %: %', NEW.id, SQLERRM;
      END;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Crear el trigger sobre listings
DROP TRIGGER IF EXISTS trigger_sync_availability_and_slots ON public.listings;
CREATE TRIGGER trigger_sync_availability_and_slots
AFTER UPDATE OF availability, standard_duration, duration ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.on_listings_update_sync_and_regen();
  