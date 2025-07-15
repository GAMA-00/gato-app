-- Generar slots manualmente usando la función corregida
SELECT generate_provider_time_slots_for_listing(
  '60be5723-955e-4cd0-8d9f-5f2404ff1745'::uuid, 
  '3324cbd2-12cd-4e81-8084-94f611b2a462'::uuid, 
  2
) as slots_generated;