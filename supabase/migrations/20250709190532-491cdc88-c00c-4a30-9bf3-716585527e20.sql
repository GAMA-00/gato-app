-- Fix the extract function errors in database functions
-- The issue is with EXTRACT functions receiving wrong parameter types

-- Drop and recreate the problematic trigger function
DROP TRIGGER IF EXISTS set_appointment_names_trigger ON appointments;
DROP FUNCTION IF EXISTS public.set_appointment_names();

-- Recreate the function with proper type handling
CREATE OR REPLACE FUNCTION public.set_appointment_names()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Establecer el nombre del cliente
  SELECT name INTO NEW.client_name
  FROM users
  WHERE id = NEW.client_id;
  
  -- Establecer el nombre del proveedor
  SELECT name INTO NEW.provider_name
  FROM users
  WHERE id = NEW.provider_id;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER set_appointment_names_trigger
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_appointment_names();