-- 1. Asegurar que pg_net está habilitado
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Corregir el trigger de cobro recurrente automático
CREATE OR REPLACE FUNCTION trigger_membership_charge_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_id UUID;
  v_http_response_id BIGINT;
  v_payload JSONB;
BEGIN
  -- Solo procesar si el appointment cambió a 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    RAISE LOG '🔔 Appointment % completed, checking for active subscription', NEW.id;
    
    -- Buscar suscripción activa asociada al appointment
    SELECT id INTO v_subscription_id
    FROM onvopay_subscriptions
    WHERE client_id = NEW.client_id
      AND provider_id = NEW.provider_id
      AND status = 'active'
      AND payment_method_id IS NOT NULL
      AND payment_method_id != ''
    LIMIT 1;
    
    IF v_subscription_id IS NOT NULL THEN
      RAISE LOG '✅ Found active subscription % with payment method, triggering charge', v_subscription_id;
      
      -- Preparar payload para la Edge Function
      v_payload := jsonb_build_object(
        'subscription_id', v_subscription_id::text,
        'appointment_id', NEW.id::text
      );
      
      -- Llamar a la Edge Function de manera asíncrona usando pg_net
      SELECT net.http_post(
        url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/onvopay-process-membership-charge',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQzNDU4MCwiZXhwIjoyMDYxMDEwNTgwfQ.mKEyEf9EqiZvNBHMVKbOkwWNXMFLYZeU-c5WRKUq5Q4'
        ),
        body := v_payload
      ) INTO v_http_response_id;
      
      RAISE LOG '✅ HTTP POST queued successfully. Response ID: %', v_http_response_id;
    ELSE
      RAISE LOG '⚠️ No active subscription found for appointment % (client: %, provider: %)', 
        NEW.id, NEW.client_id, NEW.provider_id;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log el error pero no fallar el trigger
    RAISE LOG '❌ Error in trigger_membership_charge_on_completion: % - %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- 3. Recrear el trigger si existe
DROP TRIGGER IF EXISTS on_appointment_completed_charge_subscription ON appointments;

CREATE TRIGGER on_appointment_completed_charge_subscription
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_membership_charge_on_completion();

-- 4. Crear función para retry de cobros fallidos
CREATE OR REPLACE FUNCTION retry_failed_recurring_charges()
RETURNS TABLE(
  subscription_id UUID,
  client_name TEXT,
  provider_name TEXT,
  amount NUMERIC,
  failed_attempts INTEGER,
  retry_status TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_http_response_id BIGINT;
  v_payload JSONB;
  v_retried_count INTEGER := 0;
BEGIN
  RAISE LOG '🔄 Starting retry of failed recurring charges';
  
  -- Buscar todas las suscripciones con intentos fallidos
  FOR v_subscription IN
    SELECT 
      s.id,
      s.client_id,
      s.provider_id,
      s.amount,
      s.failed_attempts,
      s.last_failure_reason,
      uc.name as client_name,
      up.name as provider_name
    FROM onvopay_subscriptions s
    JOIN users uc ON uc.id = s.client_id
    JOIN users up ON up.id = s.provider_id
    WHERE s.status = 'active'
      AND s.failed_attempts > 0
      AND s.payment_method_id IS NOT NULL
      AND s.payment_method_id != ''
  LOOP
    BEGIN
      RAISE LOG '🔄 Retrying subscription % (failed_attempts: %)', v_subscription.id, v_subscription.failed_attempts;
      
      -- Preparar payload
      v_payload := jsonb_build_object(
        'subscription_id', v_subscription.id::text,
        'appointment_id', NULL  -- No hay appointment específico en retry manual
      );
      
      -- Llamar a la Edge Function
      SELECT net.http_post(
        url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/onvopay-process-membership-charge',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQzNDU4MCwiZXhwIjoyMDYxMDEwNTgwfQ.mKEyEf9EqiZvNBHMVKbOkwWNXMFLYZeU-c5WRKUq5Q4'
        ),
        body := v_payload
      ) INTO v_http_response_id;
      
      v_retried_count := v_retried_count + 1;
      
      RETURN QUERY SELECT 
        v_subscription.id,
        v_subscription.client_name,
        v_subscription.provider_name,
        v_subscription.amount,
        v_subscription.failed_attempts,
        'queued'::TEXT,
        'HTTP request queued with ID: ' || v_http_response_id::TEXT;
        
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT 
          v_subscription.id,
          v_subscription.client_name,
          v_subscription.provider_name,
          v_subscription.amount,
          v_subscription.failed_attempts,
          'error'::TEXT,
          SQLERRM;
    END;
  END LOOP;
  
  RAISE LOG '✅ Retry process completed. Retried % subscriptions', v_retried_count;
  
  IF v_retried_count = 0 THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      'No subscriptions to retry'::TEXT,
      ''::TEXT,
      0::NUMERIC,
      0::INTEGER,
      'info'::TEXT,
      'All subscriptions are healthy'::TEXT;
  END IF;
END;
$$;

-- 5. Agregar índices para mejorar performance de queries recurrentes
CREATE INDEX IF NOT EXISTS idx_onvopay_subscriptions_active_with_payment 
ON onvopay_subscriptions(client_id, provider_id, status) 
WHERE status = 'active' AND payment_method_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onvopay_subscriptions_failed_attempts 
ON onvopay_subscriptions(status, failed_attempts) 
WHERE failed_attempts > 0;

COMMENT ON FUNCTION trigger_membership_charge_on_completion IS 'Trigger automático que ejecuta cobro recurrente cuando se completa una cita';
COMMENT ON FUNCTION retry_failed_recurring_charges IS 'Función manual para reintentar cobros recurrentes fallidos';