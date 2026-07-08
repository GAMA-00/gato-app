-- Agregar campos para variables personalizadas flexibles en la tabla listings
ALTER TABLE listings 
ADD COLUMN use_custom_variables BOOLEAN DEFAULT FALSE,
ADD COLUMN custom_variable_groups JSONB DEFAULT NULL;

-- Agregar comentarios para documentar los nuevos campos
COMMENT ON COLUMN listings.use_custom_variables IS 'Indica si el servicio utiliza variables personalizadas flexibles';
COMMENT ON COLUMN listings.custom_variable_groups IS 'Grupos de variables personalizadas definidas por el proveedor en formato JSON';