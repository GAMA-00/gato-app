-- Insertar disponibilidad para el proveedor específico basándose en el listing
INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_active)
VALUES 
  -- Lunes (1): 09:00-17:00
  ('515541fc-a4ed-465d-b6e0-321f9c01b5b1', 1, '09:00', '17:00', true),
  -- Martes (2): 09:00-17:00  
  ('515541fc-a4ed-465d-b6e0-321f9c01b5b1', 2, '09:00', '17:00', true),
  -- Domingo (0): 09:00-17:00
  ('515541fc-a4ed-465d-b6e0-321f9c01b5b1', 0, '09:00', '17:00', true)
ON CONFLICT (provider_id, day_of_week, start_time, end_time) DO NOTHING;

-- Ahora generar los slots para el listing
SELECT generate_provider_time_slots_for_listing(
  '515541fc-a4ed-465d-b6e0-321f9c01b5b1'::UUID,
  '4831d79a-d9b3-4dc4-a4fe-3507fb55a249'::UUID,
  4
) as slots_created;