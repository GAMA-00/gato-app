-- Crear trigger AFTER INSERT para iniciar transacciones de pago en citas recurrentes
-- Este trigger crea una transacción "Iniciada" cuando se inserta una nueva cita recurrente

CREATE OR REPLACE FUNCTION trigger_initiate_recurring_payment_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_http_response_id BIGINT;
  v_supabase_url TEXT := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key TEXT := current_setting('app.settings.supabase_anon_key', true);
BEGIN
  -- Solo procesar citas recurrentes
  IF (NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none') OR NEW.is_recurring_instance = true THEN
    RAISE LOG '🎬 Trigger INSERT: Initiating payment for appointment % (recurrence: %, is_recurring: %)', 
      NEW.id, NEW.recurrence, NEW.is_recurring_instance;

    -- Llamar a onvopay-initiate-recurring asíncronamente
    BEGIN
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/onvopay-initiate-recurring',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_supabase_anon_key
        ),
        body := jsonb_build_object(
          'appointment_id', NEW.id,
          'force', false
        )
      ) INTO v_http_response_id;

      RAISE LOG '✅ Payment initiation request queued for appointment % (request_id: %)', 
        NEW.id, v_http_response_id;

    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '❌ Error queuing payment initiation for appointment %: %', NEW.id, SQLERRM;
      -- No fallar el trigger, solo loggear
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear el trigger AFTER INSERT
DROP TRIGGER IF EXISTS on_appointment_insert_initiate_payment ON appointments;

CREATE TRIGGER on_appointment_insert_initiate_payment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initiate_recurring_payment_on_insert();