-- Check for dependencies before deletion
DO $$
DECLARE
  tutoria_primaria_listings_count INTEGER;
  tutoria_primaria_appointments_count INTEGER;
BEGIN
  -- Check for listings using "Tutorías Primaria"
  SELECT COUNT(*) INTO tutoria_primaria_listings_count
  FROM listings 
  WHERE service_type_id = '02114c6e-702c-495e-a8f7-1b2864bac2e5';
  
  -- Check for appointments related to listings with "Tutorías Primaria"
  SELECT COUNT(*) INTO tutoria_primaria_appointments_count
  FROM appointments a
  JOIN listings l ON a.listing_id = l.id
  WHERE l.service_type_id = '02114c6e-702c-495e-a8f7-1b2864bac2e5';
  
  -- If there are dependencies, we need to handle them first
  IF tutoria_primaria_listings_count > 0 OR tutoria_primaria_appointments_count > 0 THEN
    RAISE LOG 'Found dependencies: % listings, % appointments for Tutorías Primaria', 
      tutoria_primaria_listings_count, tutoria_primaria_appointments_count;
    
    -- Update any existing listings to use "Tutorías Secundaria" service type instead
    UPDATE listings 
    SET service_type_id = 'b9bea420-2215-4e60-9c5d-40bbfb556973'
    WHERE service_type_id = '02114c6e-702c-495e-a8f7-1b2864bac2e5';
    
    RAISE LOG 'Migrated % listings from Tutorías Primaria to Tutorías Secundaria', tutoria_primaria_listings_count;
  END IF;
END $$;

-- Now rename "Tutorías Secundaria" to "Tutorías"
UPDATE service_types 
SET name = 'Tutorías'
WHERE id = 'b9bea420-2215-4e60-9c5d-40bbfb556973' 
AND name = 'Tutorías Secundaria';

-- Delete "Tutorías Primaria" service type
DELETE FROM service_types 
WHERE id = '02114c6e-702c-495e-a8f7-1b2864bac2e5' 
AND name = 'Tutorías Primaria';