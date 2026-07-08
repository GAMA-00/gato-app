-- Debug: Insertar un slot manualmente para probar
INSERT INTO provider_time_slots (
  provider_id,
  listing_id,
  slot_date,
  start_time,
  end_time,
  slot_datetime_start,
  slot_datetime_end,
  is_available,
  is_reserved
) VALUES (
  '60be5723-955e-4cd0-8d9f-5f2404ff1745'::uuid,
  '3324cbd2-12cd-4e81-8084-94f611b2a462'::uuid,
  CURRENT_DATE + 1,
  '08:00:00'::time,
  '13:00:00'::time,
  (CURRENT_DATE + 1 + '08:00:00'::time) AT TIME ZONE 'America/Costa_Rica',
  (CURRENT_DATE + 1 + '13:00:00'::time) AT TIME ZONE 'America/Costa_Rica',
  true,
  false
);