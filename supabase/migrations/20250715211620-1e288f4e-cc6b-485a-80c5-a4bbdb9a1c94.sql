-- Limpiar slots incorrectos y regenerar correctamente
DELETE FROM provider_time_slots 
WHERE provider_id = '60be5723-955e-4cd0-8d9f-5f2404ff1745' 
  AND listing_id = '3324cbd2-12cd-4e81-8084-94f611b2a462'
  AND slot_date >= CURRENT_DATE;

-- Regenerar slots para el listing
SELECT regenerate_slots_for_listing('3324cbd2-12cd-4e81-8084-94f611b2a462'::uuid) as slots_created;