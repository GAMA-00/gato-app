-- Migrar disponibilidad para el proveedor 53bc40be-c362-4900-9d0a-4004209d2d89
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_active)
VALUES 
  -- Sábado (6): 09:00-17:00
  ('53bc40be-c362-4900-9d0a-4004209d2d89', 6, '09:00', '17:00', true),
  -- Domingo (0): 09:00-17:00  
  ('53bc40be-c362-4900-9d0a-4004209d2d89', 0, '09:00', '17:00', true)
ON CONFLICT (provider_id, day_of_week, start_time, end_time) DO NOTHING;

-- Generar slots para este proveedor y listing
SELECT generate_provider_time_slots_for_listing(
  '53bc40be-c362-4900-9d0a-4004209d2d89'::UUID,
  '5b520750-7c64-4b56-bcc5-12c4a1fa1045'::UUID,
  4
) as slots_created;