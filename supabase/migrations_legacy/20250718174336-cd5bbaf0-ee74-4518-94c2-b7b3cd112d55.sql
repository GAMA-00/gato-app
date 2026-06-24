-- Update service type name from "Floristeria" to "Floristería" with accent
UPDATE service_types 
SET name = 'Floristería' 
WHERE name = 'Floristeria';