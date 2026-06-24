-- ============================================
-- MIGRACIÓN: Simplificar sistema de slots
-- Los slots se crean UNA VEZ y solo se bloquean/desbloquean individualmente
-- ============================================

-- 1) Crear función simple de toggle de slot
CREATE OR REPLACE FUNCTION toggle_slot_availability(
  p_slot_id UUID,
  p_is_available BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE provider_time_slots
  SET 
    is_available = p_is_available,
    is_reserved = NOT p_is_available,
    slot_type = CASE 
      WHEN p_is_available = false THEN 'manually_blocked'
      ELSE 'generated'
    END
  WHERE id = p_slot_id;
  
  RETURN FOUND;
END;
$$;

-- 2) Eliminar triggers destructivos de la tabla listings
DROP TRIGGER IF EXISTS sync_listing_availability_trigger ON listings;
DROP TRIGGER IF EXISTS trigger_sync_availability_and_slots ON listings;

-- 3) Eliminar trigger destructivo de provider_availability
DROP TRIGGER IF EXISTS trigger_cleanup_disabled_availability ON provider_availability;

-- 4) Reemplazar funciones destructivas con versiones no-op (seguras)
-- Esto previene cualquier llamada accidental desde código legacy

CREATE OR REPLACE FUNCTION regenerate_slots_for_listing_safe(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- NO-OP: Los slots no deben regenerarse automáticamente
  -- Solo se crean una vez al crear el anuncio
  RAISE LOG 'regenerate_slots_for_listing_safe: NO-OP - slots son estáticos (listing_id=%)', p_listing_id;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION regenerate_slots_for_listing(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- NO-OP: Los slots no deben regenerarse automáticamente
  RAISE LOG 'regenerate_slots_for_listing: NO-OP - slots son estáticos (listing_id=%)', p_listing_id;
  RETURN 0;
END;
$$;

-- 5) Función segura para limpiar slots específicos de días pasados (opcional, solo admin)
CREATE OR REPLACE FUNCTION cleanup_past_slots(p_provider_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Solo eliminar slots de días PASADOS (no hoy ni futuro)
  IF p_provider_id IS NOT NULL THEN
    DELETE FROM provider_time_slots
    WHERE provider_id = p_provider_id
      AND slot_date < CURRENT_DATE;
  ELSE
    DELETE FROM provider_time_slots
    WHERE slot_date < CURRENT_DATE;
  END IF;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;