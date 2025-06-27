
-- Migrar datos de apartment a house_number donde sea necesario
UPDATE users 
SET house_number = COALESCE(house_number, 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM appointments 
      WHERE appointments.client_id = users.id 
      AND appointments.apartment IS NOT NULL 
      AND appointments.apartment != ''
    ) THEN (
      SELECT appointments.apartment 
      FROM appointments 
      WHERE appointments.client_id = users.id 
      AND appointments.apartment IS NOT NULL 
      AND appointments.apartment != ''
      LIMIT 1
    )
    ELSE house_number
  END
)
WHERE house_number IS NULL OR house_number = '';

-- Eliminar la columna apartment de la tabla appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS apartment;

-- Asegurar que los campos de ubicación estén optimizados
UPDATE users 
SET 
  condominium_name = COALESCE(condominium_name, condominium_text),
  condominium_text = COALESCE(condominium_text, condominium_name)
WHERE (condominium_name IS NULL OR condominium_name = '') 
   OR (condominium_text IS NULL OR condominium_text = '');
