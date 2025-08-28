-- First, get the home category ID
DO $$
DECLARE
  home_category_id UUID;
BEGIN
  -- Get the home category ID
  SELECT id INTO home_category_id FROM service_categories WHERE name = 'home';
  
  -- Delete the "Limpieza" service type
  DELETE FROM service_types WHERE name = 'Limpieza' AND category_id = home_category_id;
  
  -- Insert the new "Fumigación" service type
  INSERT INTO service_types (name, category_id) 
  VALUES ('Fumigación', home_category_id);
END $$;