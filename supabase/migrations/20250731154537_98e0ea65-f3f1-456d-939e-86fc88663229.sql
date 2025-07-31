-- Arreglar el issue de seguridad agregando search_path
CREATE OR REPLACE FUNCTION generate_all_provider_time_slots()
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  listing_record RECORD;
  slots_created INTEGER := 0;
  total_slots INTEGER := 0;
BEGIN
  -- Iterar sobre todos los listings activos que tienen availability
  FOR listing_record IN 
    SELECT id, provider_id, availability, standard_duration
    FROM listings 
    WHERE is_active = true 
    AND availability IS NOT NULL
    AND availability != '{}'::jsonb
  LOOP
    -- Generar slots para este listing usando la función existente
    SELECT generate_provider_time_slots_for_listing(
      listing_record.provider_id,
      listing_record.id,
      4 -- 4 semanas adelante
    ) INTO slots_created;
    
    total_slots := total_slots + slots_created;
    
    RAISE LOG 'Generated % slots for listing %', slots_created, listing_record.id;
  END LOOP;
  
  RETURN total_slots;
END;
$$;