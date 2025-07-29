-- Generar slots de tiempo para el proveedor que no tiene horarios disponibles
-- Primero verificamos si existe la función generate_provider_time_slots
SELECT generate_provider_time_slots(
  '39e28003-f962-4af9-92fe-13a0ca428eba'::uuid,  -- provider_id
  '9b5032ba-f51d-4354-bda3-d0718299de22'::uuid,  -- listing_id
  '2025-07-29'::date,                             -- start_date (hoy)
  '2025-08-29'::date,                             -- end_date (30 días desde hoy)
  ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],  -- days_of_week
  '09:00'::time,                                  -- start_time
  '18:00'::time,                                  -- end_time
  60                                              -- slot_duration_minutes
);