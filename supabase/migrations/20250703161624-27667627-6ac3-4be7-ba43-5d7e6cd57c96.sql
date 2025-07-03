-- Agregar campos para variables personalizadas en appointments
ALTER TABLE appointments 
ADD COLUMN custom_variable_selections JSONB DEFAULT NULL,
ADD COLUMN custom_variables_total_price NUMERIC DEFAULT 0;

-- Agregar comentarios para documentar los nuevos campos
COMMENT ON COLUMN appointments.custom_variable_selections IS 'Selecciones de variables personalizadas del cliente en formato JSON';
COMMENT ON COLUMN appointments.custom_variables_total_price IS 'Precio total de las variables personalizadas seleccionadas';