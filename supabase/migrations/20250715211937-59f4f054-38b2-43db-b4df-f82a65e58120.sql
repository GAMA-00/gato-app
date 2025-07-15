-- Generar slots para toda la semana respetando la disponibilidad
-- Lunes (día 1): 8:00 AM - 6:00 PM, slot de 5 horas posible: 8:00-13:00
INSERT INTO provider_time_slots (provider_id, listing_id, slot_date, start_time, end_time, slot_datetime_start, slot_datetime_end, is_available, is_reserved)
SELECT 
  '60be5723-955e-4cd0-8d9f-5f2404ff1745'::uuid,
  '3324cbd2-12cd-4e81-8084-94f611b2a462'::uuid,
  date_val,
  '08:00:00'::time,
  '13:00:00'::time,
  (date_val + '08:00:00'::time) AT TIME ZONE 'America/Costa_Rica',
  (date_val + '13:00:00'::time) AT TIME ZONE 'America/Costa_Rica',
  true,
  false
FROM (
  SELECT CURRENT_DATE + i as date_val
  FROM generate_series(0, 13) as i
  WHERE EXTRACT(DOW FROM CURRENT_DATE + i) BETWEEN 1 AND 5  -- Lunes a Viernes
) dates
ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;

-- Sábados (día 6): 9:00 AM - 3:00 PM, slot de 5 horas posible: 9:00-14:00
INSERT INTO provider_time_slots (provider_id, listing_id, slot_date, start_time, end_time, slot_datetime_start, slot_datetime_end, is_available, is_reserved)
SELECT 
  '60be5723-955e-4cd0-8d9f-5f2404ff1745'::uuid,
  '3324cbd2-12cd-4e81-8084-94f611b2a462'::uuid,
  date_val,
  '09:00:00'::time,
  '14:00:00'::time,
  (date_val + '09:00:00'::time) AT TIME ZONE 'America/Costa_Rica',
  (date_val + '14:00:00'::time) AT TIME ZONE 'America/Costa_Rica',
  true,
  false
FROM (
  SELECT CURRENT_DATE + i as date_val
  FROM generate_series(0, 13) as i
  WHERE EXTRACT(DOW FROM CURRENT_DATE + i) = 6  -- Sábados
) dates
ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;