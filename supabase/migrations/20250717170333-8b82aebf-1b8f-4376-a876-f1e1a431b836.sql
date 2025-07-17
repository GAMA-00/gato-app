-- Actualizar el avatar del proveedor Vicente
UPDATE users 
SET avatar_url = 'https://jckynopecuexfamepmoh.supabase.co/storage/v1/object/public/avatars/vicente-chef.jpg'
WHERE email = 'prov@gato.com' AND role = 'provider';