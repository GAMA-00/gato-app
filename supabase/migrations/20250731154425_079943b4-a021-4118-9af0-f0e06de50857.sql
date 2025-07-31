-- Función para generar slots para todos los listings activos
CREATE OR REPLACE FUNCTION generate_all_provider_time_slots()
RETURNS INTEGER AS $$
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
    -- Generar slots para este listing
    PERFORM generate_provider_time_slots(
      listing_record.provider_id,
      listing_record.id,
      listing_record.availability,
      COALESCE(listing_record.standard_duration, 60),
      14 -- 2 semanas adelante
    );
    
    -- Contar slots creados para este listing
    SELECT COUNT(*) INTO slots_created
    FROM provider_time_slots
    WHERE listing_id = listing_record.id
    AND slot_date >= CURRENT_DATE;
    
    total_slots := total_slots + slots_created;
    
    RAISE LOG 'Generated % slots for listing %', slots_created, listing_record.id;
  END LOOP;
  
  RETURN total_slots;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función para generar slots para todos los listings existentes
SELECT generate_all_provider_time_slots();