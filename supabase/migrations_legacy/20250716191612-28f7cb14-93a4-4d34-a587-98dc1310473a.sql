-- Limpiar slots existentes para el servicio de Yoga y regenerar correctamente
-- Solo eliminamos slots futuros que no estén reservados

DELETE FROM provider_time_slots 
WHERE provider_id = '60be5723-955e-4cd0-8d9f-5f2404ff1745'
  AND listing_id = 'a84628cc-2bad-46f5-a1b9-d6df7c590d99'
  AND slot_date >= CURRENT_DATE
  AND is_reserved = false;

-- Regenerar los slots con la función existente
SELECT regenerate_slots_for_listing('a84628cc-2bad-46f5-a1b9-d6df7c590d99'::uuid) as slots_regenerated;