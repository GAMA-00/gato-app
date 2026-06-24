-- ================================================================
-- TRIGGER AUTOMÁTICO PARA INICIAR PAGOS RECURRENTES
-- ================================================================
-- Crea automáticamente el Payment Intent "Iniciado" cuando se crea
-- una cita recurrente, garantizando visibilidad en OnvoPay dashboard

CREATE OR REPLACE FUNCTION trigger_initiate_recurring_payment()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Solo para citas recurrentes (no 'none', no NULL, no vacío)
  IF NEW.recurrence IS NOT NULL 
     AND NEW.recurrence != 'none' 
     AND NEW.recurrence != '' 
  THEN
    -- Construir URL de la edge function
    function_url := current_setting('app.settings')::json->>'supabase_url' || '/functions/v1/onvopay-initiate-recurring';
    service_role_key := current_setting('app.settings')::json->>'supabase_service_role_key';
    
    -- Invocar edge function de forma asíncrona usando pg_net
    PERFORM
      net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'appointment_id', NEW.id::text,
          'force', false
        )
      );
    
    RAISE LOG 'Trigger: Initiated recurring payment for appointment %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger que se ejecuta DESPUÉS de insertar appointment
DROP TRIGGER IF EXISTS on_appointment_insert_initiate_payment ON appointments;

CREATE TRIGGER on_appointment_insert_initiate_payment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initiate_recurring_payment();

COMMENT ON TRIGGER on_appointment_insert_initiate_payment ON appointments IS 
  'Automatically initiates OnvoPay Payment Intent for recurring appointments';

-- ================================================================
-- CONFIGURACIÓN DE SETTINGS PARA EL TRIGGER
-- ================================================================
-- Nota: Estos settings deben ser configurados en runtime por Supabase
-- ALTER DATABASE postgres SET app.settings TO '{"supabase_url": "https://jckynopecuexfamepmoh.supabase.co", "supabase_service_role_key": "SERVICE_ROLE_KEY"}';
