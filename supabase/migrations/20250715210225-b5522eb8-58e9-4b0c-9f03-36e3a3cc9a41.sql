-- Crear constraint único para provider_availability si no existe
ALTER TABLE provider_availability 
ADD CONSTRAINT unique_provider_day 
UNIQUE (provider_id, day_of_week);

-- Insertar disponibilidad básica para el proveedor
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_active)
SELECT 
  '60be5723-955e-4cd0-8d9f-5f2404ff1745'::uuid, 
  day_num,
  CASE 
    WHEN day_num = 6 THEN '09:00:00'::time 
    ELSE '08:00:00'::time 
  END,
  CASE 
    WHEN day_num = 6 THEN '15:00:00'::time 
    ELSE '18:00:00'::time 
  END,
  true
FROM generate_series(1, 6) AS day_num
WHERE NOT EXISTS (
  SELECT 1 FROM provider_availability 
  WHERE provider_id = '60be5723-955e-4cd0-8d9f-5f2404ff1745' 
  AND day_of_week = day_num
);

-- Ahora regenerar slots para el listing
SELECT regenerate_slots_for_listing('3324cbd2-12cd-4e81-8084-94f611b2a462'::uuid) as slots_created;