-- Recomendación + descuento por proximidad (concepto v1) — F5, pilar #3
-- Cuando el cliente fija su cantón en el booking link, se le recomiendan los slots
-- contiguos (anterior/posterior+buffer) a citas del proveedor en ese mismo cantón ese
-- día. Ver docs/CONCEPTO_V1.md §8.2 y docs/skills/SKILL_PROXIMITY_SLOTS.md
--
-- Seguridad: estos RPC son SECURITY DEFINER y NO exponen datos de clientes; solo
-- devuelven horarios recomendados y la config de descuento del proveedor.

-- ============================================================
-- 1. Horarios recomendados para un cliente en cierto cantón
-- ============================================================
-- Devuelve los slot_datetime_start (de slots realmente disponibles del listing) que son
-- contiguos a una cita del proveedor en el MISMO cantón ese día:
--   - el slot que termina justo cuando empieza esa cita (anterior)
--   - el slot que empieza justo al terminar esa cita + buffer (posterior)
CREATE OR REPLACE FUNCTION public.get_recommended_slot_starts(
  p_provider_id uuid,
  p_listing_id uuid,
  p_canton_id integer
)
RETURNS TABLE (slot_start timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buffer integer;
BEGIN
  IF p_canton_id IS NULL THEN
    RETURN;  -- sin cantón no hay recomendaciones
  END IF;

  SELECT COALESCE(ps.buffer_minutes, 30) INTO v_buffer
  FROM provider_settings ps WHERE ps.provider_id = p_provider_id;
  v_buffer := COALESCE(v_buffer, 30);

  RETURN QUERY
  WITH same_canton AS (
    SELECT a.start_time, a.end_time
    FROM appointments a
    WHERE a.provider_id = p_provider_id
      AND a.canton_id = p_canton_id
      AND a.status IN ('pending', 'confirmed')
      AND a.start_time >= now()
  ),
  candidates AS (
    SELECT (start_time - interval '30 minutes') AS s FROM same_canton
    UNION
    SELECT (end_time + (v_buffer || ' minutes')::interval) AS s FROM same_canton
  )
  SELECT pts.slot_datetime_start
  FROM candidates c
  JOIN provider_time_slots pts
    ON pts.provider_id = p_provider_id
   AND pts.listing_id = p_listing_id
   AND pts.slot_datetime_start = c.s
   AND pts.is_available = true
   AND pts.is_reserved = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recommended_slot_starts(uuid, uuid, integer) TO anon, authenticated;

-- ============================================================
-- 2. Config pública de proximidad del proveedor (para el booking link)
-- ============================================================
-- Solo expone lo necesario para mostrar recomendaciones/descuento; nada sensible.
-- Devuelve siempre una fila (defaults si el proveedor no tiene config).
CREATE OR REPLACE FUNCTION public.get_provider_public_settings(p_provider_id uuid)
RETURNS TABLE (
  show_recommended_slots boolean,
  proximity_discount_enabled boolean,
  proximity_discount_pct integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(ps.show_recommended_slots, true),
    COALESCE(ps.proximity_discount_enabled, false),
    COALESCE(ps.proximity_discount_pct, 0)
  FROM (SELECT 1) x
  LEFT JOIN provider_settings ps ON ps.provider_id = p_provider_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_public_settings(uuid) TO anon, authenticated;
