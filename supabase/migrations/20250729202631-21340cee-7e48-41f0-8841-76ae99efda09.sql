-- Función corregida para verificar y corregir avatares vacíos
CREATE OR REPLACE FUNCTION fix_empty_avatars()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  avatar_path TEXT;
  new_avatar_url TEXT;
BEGIN
  -- Buscar usuarios con avatar_url vacío o null
  FOR user_record IN 
    SELECT id, name, role, avatar_url
    FROM users 
    WHERE (users.avatar_url IS NULL OR users.avatar_url = '') 
    AND users.role = 'provider'
  LOOP
    -- Construir la ruta esperada del avatar
    avatar_path := user_record.id || '/avatar.jpg';
    
    -- Construir la URL pública del avatar
    new_avatar_url := 'https://jckynopecuexfamepmoh.supabase.co/storage/v1/object/public/avatars/' || avatar_path;
    
    -- Actualizar el avatar_url en la tabla users
    UPDATE users 
    SET avatar_url = new_avatar_url
    WHERE users.id = user_record.id;
    
    RAISE LOG 'Updated avatar for user % (%) with URL: %', 
      user_record.name, user_record.id, new_avatar_url;
  END LOOP;
END;
$$;

-- Ejecutar la función para corregir avatares
SELECT fix_empty_avatars();

-- Verificar el resultado para el usuario específico
SELECT id, name, avatar_url FROM users WHERE id = '39e28003-f962-4af9-92fe-13a0ca428eba';