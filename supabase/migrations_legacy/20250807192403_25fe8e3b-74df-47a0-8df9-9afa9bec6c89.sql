-- Direct fix: Regenerate slots for Friday August 8th, 2025
-- First, let's check current state
SELECT 
  slot_date,
  start_time,
  is_available,
  is_reserved,
  recurring_blocked
FROM provider_time_slots 
WHERE listing_id = 'f8e8554c-a1a3-4163-913f-dbf99d0cd812'::UUID
  AND slot_date = '2025-08-08'::DATE
ORDER BY start_time;

-- Delete unreserved slots for Friday August 8th to regenerate
DELETE FROM provider_time_slots
WHERE listing_id = 'f8e8554c-a1a3-4163-913f-dbf99d0cd812'::UUID
  AND slot_date = '2025-08-08'::DATE
  AND is_reserved = false;

-- Generate new slots for Friday August 8th based on provider availability (7:00-17:00, 60 min duration)
INSERT INTO provider_time_slots (
  provider_id,
  listing_id,
  slot_date,
  start_time,
  end_time,
  slot_datetime_start,
  slot_datetime_end,
  is_available,
  is_reserved,
  recurring_blocked
) 
SELECT 
  l.provider_id,
  l.id as listing_id,
  '2025-08-08'::DATE as slot_date,
  generate_series.time_slot as start_time,
  generate_series.time_slot + (l.standard_duration || ' minutes')::INTERVAL as end_time,
  ('2025-08-08'::DATE + generate_series.time_slot) AT TIME ZONE 'America/Costa_Rica' as slot_datetime_start,
  ('2025-08-08'::DATE + generate_series.time_slot + (l.standard_duration || ' minutes')::INTERVAL) AT TIME ZONE 'America/Costa_Rica' as slot_datetime_end,
  true as is_available,
  false as is_reserved,
  false as recurring_blocked
FROM listings l
CROSS JOIN (
  SELECT generate_series('07:00:00'::TIME, '16:00:00'::TIME, '1 hour'::INTERVAL) as time_slot
) generate_series
WHERE l.id = 'f8e8554c-a1a3-4163-913f-dbf99d0cd812'::UUID
  AND l.is_active = true
  -- Only generate future slots
  AND ('2025-08-08'::DATE + generate_series.time_slot) AT TIME ZONE 'America/Costa_Rica' > NOW()
  -- Skip 12:00 slot if it has a confirmed appointment
  AND NOT EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.provider_id = l.provider_id
      AND a.listing_id = l.id
      AND a.start_time < ('2025-08-08'::DATE + generate_series.time_slot + (l.standard_duration || ' minutes')::INTERVAL) AT TIME ZONE 'America/Costa_Rica'
      AND a.end_time > ('2025-08-08'::DATE + generate_series.time_slot) AT TIME ZONE 'America/Costa_Rica'
      AND a.status IN ('confirmed', 'pending')
  )
ON CONFLICT (provider_id, listing_id, slot_datetime_start) DO NOTHING;

-- Verify the results
SELECT 
  'After regeneration' as status,
  slot_date,
  start_time,
  is_available,
  is_reserved
FROM provider_time_slots 
WHERE listing_id = 'f8e8554c-a1a3-4163-913f-dbf99d0cd812'::UUID
  AND slot_date = '2025-08-08'::DATE
ORDER BY start_time;