-- Insertar disponibilidad básica para el proveedor (lunes a viernes 8AM-6PM)
DO $$
DECLARE
  provider_uuid UUID;
BEGIN
  -- Obtener el provider_id del listing
  SELECT provider_id INTO provider_uuid
  FROM listings 
  WHERE id = '3324cbd2-12cd-4e81-8084-94f611b2a462';
  
  IF provider_uuid IS NOT NULL THEN
    -- Insertar disponibilidad básica para días laborales (lunes=1 a viernes=5)
    INSERT INTO provider_availability (provider_id, day_of_week, start_time, end_time, is_active)
    VALUES 
      (provider_uuid, 1, '08:00:00', '18:00:00', true), -- Lunes
      (provider_uuid, 2, '08:00:00', '18:00:00', true), -- Martes
      (provider_uuid, 3, '08:00:00', '18:00:00', true), -- Miércoles
      (provider_uuid, 4, '08:00:00', '18:00:00', true), -- Jueves
      (provider_uuid, 5, '08:00:00', '18:00:00', true), -- Viernes
      (provider_uuid, 6, '09:00:00', '15:00:00', true)  -- Sábado (horario reducido)
    ON CONFLICT (provider_id, day_of_week) DO UPDATE SET
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      is_active = EXCLUDED.is_active;
      
    RAISE NOTICE 'Disponibilidad básica creada para proveedor %', provider_uuid;
  END IF;
END;
$$;