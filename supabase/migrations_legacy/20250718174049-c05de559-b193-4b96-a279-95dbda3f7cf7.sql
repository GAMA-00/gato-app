-- Add new service type "Floristeria" to the Hogar category
INSERT INTO service_types (name, category_id) 
SELECT 'Floristeria', id 
FROM service_categories 
WHERE name = 'home';