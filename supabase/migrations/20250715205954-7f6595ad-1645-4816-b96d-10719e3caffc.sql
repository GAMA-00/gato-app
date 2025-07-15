-- Actualizar la función para usar security definer
CREATE OR REPLACE FUNCTION regenerate_slots_for_listing(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  provider_id_var UUID;
  slots_created INTEGER;
BEGIN
  -- Obtener el provider_id del listing
  SELECT provider_id INTO provider_id_var
  FROM listings
  WHERE id = p_listing_id AND is_active = true;
  
  IF provider_id_var IS NULL THEN
    RAISE EXCEPTION 'Listing no encontrado o inactivo: %', p_listing_id;
  END IF;
  
  -- Eliminar slots futuros existentes para este listing
  DELETE FROM provider_time_slots
  WHERE listing_id = p_listing_id 
    AND slot_date >= CURRENT_DATE
    AND is_reserved = false;
  
  -- Generar nuevos slots
  SELECT generate_provider_time_slots_for_listing(provider_id_var, p_listing_id, 4) INTO slots_created;
  
  RETURN slots_created;
END;
$$;