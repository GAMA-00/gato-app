-- Función para mantener slots futuros generados para todos los listings activos
CREATE OR REPLACE FUNCTION maintain_future_slots()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  listing RECORD;
  total_slots INTEGER := 0;
  slots_for_listing INTEGER;
BEGIN
  -- Recorrer todos los listings activos
  FOR listing IN 
    SELECT id, provider_id 
    FROM listings 
    WHERE is_active = true
  LOOP
    -- Generar slots para las próximas 4 semanas (usa ON CONFLICT DO NOTHING)
    SELECT generate_provider_time_slots_for_listing(
      listing.provider_id, 
      listing.id, 
      4
    ) INTO slots_for_listing;
    
    total_slots := total_slots + COALESCE(slots_for_listing, 0);
  END LOOP;
  
  RAISE LOG 'maintain_future_slots: Generados % slots totales', total_slots;
  RETURN total_slots;
END;
$$;

-- Ejecutar inmediatamente para corregir los datos actuales
SELECT maintain_future_slots();