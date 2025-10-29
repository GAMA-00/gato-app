-- =====================================================
-- MIGRACIÓN 1: Vincular appointments con suscripciones
-- =====================================================
DO $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE appointments a
  SET onvopay_subscription_id = s.id
  FROM onvopay_subscriptions s
  WHERE s.external_reference = a.id::text
    AND s.status = 'active'
    AND a.recurrence IS NOT NULL
    AND a.recurrence != 'none'
    AND a.onvopay_subscription_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE LOG '✅ Vinculados % appointments con sus suscripciones', updated_count;
END $$;

-- =====================================================
-- MIGRACIÓN 2: Función para procesar cobros pendientes
-- =====================================================
CREATE OR REPLACE FUNCTION process_pending_recurring_charges()
RETURNS TABLE(
  appointment_id UUID,
  subscription_id UUID,
  charge_status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  apt_record RECORD;
  v_function_url TEXT;
  v_response RECORD;
BEGIN
  FOR apt_record IN
    SELECT 
      a.id as apt_id,
      a.onvopay_subscription_id as sub_id,
      s.next_charge_date,
      s.last_charge_date
    FROM appointments a
    JOIN onvopay_subscriptions s ON s.id = a.onvopay_subscription_id
    WHERE a.status = 'completed'
      AND a.recurrence IS NOT NULL
      AND a.recurrence != 'none'
      AND s.status = 'active'
      AND s.last_charge_date IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM onvopay_payments p
        WHERE p.appointment_id = a.id
          AND p.payment_type = 'recurring'
          AND p.status IN ('captured', 'authorized')
      )
    LIMIT 10
  LOOP
    v_function_url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/onvopay-process-membership-charge';
    
    BEGIN
      SELECT * INTO v_response FROM net.http_post(
        url := v_function_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MzQ1ODAsImV4cCI6MjA2MTAxMDU4MH0.kcS5mx6kSrYqJmU3JIDizIXXsBItQVgxqD2mOa13oqE',
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'subscription_id', apt_record.sub_id,
          'appointment_id', apt_record.apt_id
        )
      );
      
      RAISE LOG '✅ Cobro pendiente procesado para appointment %', apt_record.apt_id;
      RETURN QUERY SELECT apt_record.apt_id, apt_record.sub_id, 'processed'::TEXT, 'Cobro iniciado correctamente'::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Error procesando cobro para appointment %: %', apt_record.apt_id, SQLERRM;
      RETURN QUERY SELECT apt_record.apt_id, apt_record.sub_id, 'failed'::TEXT, SQLERRM::TEXT;
    END;
  END LOOP;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, 'no_pending'::TEXT, 'No hay cobros pendientes'::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION process_pending_recurring_charges() IS 'Procesa manualmente cobros pendientes de appointments completados con suscripciones activas';

-- =====================================================
-- MIGRACIÓN 3: Cron job para cobros pendientes (backup)
-- =====================================================
SELECT cron.schedule(
  'process-pending-recurring-charges',
  '0 * * * *',
  $$SELECT process_pending_recurring_charges();$$
);

-- =====================================================
-- MIGRACIÓN 4: Mejorar trigger con logging detallado
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_membership_charge_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_record RECORD;
  v_function_url TEXT;
  v_http_response RECORD;
BEGIN
  RAISE LOG '📊 Trigger fired: appointment % status changed from % to %', NEW.id, OLD.status, NEW.status;
  
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    RAISE LOG '🔍 Appointment % completado, verificando membresía...', NEW.id;
    RAISE LOG '📋 Appointment details: onvopay_subscription_id=%, recurrence=%', NEW.onvopay_subscription_id, NEW.recurrence;
    
    -- Buscar por ID directo primero
    IF NEW.onvopay_subscription_id IS NOT NULL THEN
      SELECT * INTO subscription_record
      FROM onvopay_subscriptions
      WHERE id = NEW.onvopay_subscription_id AND status = 'active'
      LIMIT 1;
      
      IF subscription_record.id IS NOT NULL THEN
        RAISE LOG '✅ Suscripción encontrada por ID directo: %', subscription_record.id;
      ELSE
        RAISE LOG '⚠️ Suscripción no encontrada por ID % o no está activa', NEW.onvopay_subscription_id;
      END IF;
    END IF;
    
    -- Fallback: buscar por external_reference
    IF subscription_record.id IS NULL THEN
      RAISE LOG '🔍 Buscando suscripción por external_reference...';
      SELECT * INTO subscription_record
      FROM onvopay_subscriptions
      WHERE external_reference = NEW.id::text AND status = 'active'
      LIMIT 1;
      
      IF subscription_record.id IS NOT NULL THEN
        RAISE LOG '✅ Suscripción encontrada por external_reference: %', subscription_record.id;
      ELSE
        RAISE LOG '📝 No se encontró suscripción para appointment %', NEW.id;
      END IF;
    END IF;
    
    -- Si existe suscripción, procesar cobro
    IF subscription_record.id IS NOT NULL THEN
      RAISE LOG '🎯 Membresía detectada para appointment %. Procesando cobro...', NEW.id;
      RAISE LOG '📋 Subscription: id=%, status=%, next_charge_date=%, payment_method_id=%', 
        subscription_record.id, subscription_record.status, subscription_record.next_charge_date, subscription_record.payment_method_id;
      
      v_function_url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/onvopay-process-membership-charge';
      RAISE LOG '📡 Calling edge function: %', v_function_url;
      
      SELECT * INTO v_http_response FROM net.http_post(
        url := v_function_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MzQ1ODAsImV4cCI6MjA2MTAxMDU4MH0.kcS5mx6kSrYqJmU3JIDizIXXsBItQVgxqD2mOa13oqE',
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('subscription_id', subscription_record.id, 'appointment_id', NEW.id)
      );
      
      RAISE LOG '✅ HTTP POST completed. Status: %, Response ID: %', v_http_response.status, v_http_response.id;
    ELSE
      RAISE LOG '📝 No hay membresía activa para appointment %', NEW.id;
    END IF;
  ELSE
    RAISE LOG '⏭️ Status change not relevant (% -> %)', OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Error en trigger_membership_charge_on_completion: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- =====================================================
-- MIGRACIÓN 5: Asegurar que el trigger existe
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_appointment_completed_charge_membership') THEN
    CREATE TRIGGER on_appointment_completed_charge_membership
      AFTER UPDATE ON appointments
      FOR EACH ROW
      EXECUTE FUNCTION trigger_membership_charge_on_completion();
    RAISE LOG '✅ Trigger on_appointment_completed_charge_membership creado';
  ELSE
    RAISE LOG '✅ Trigger on_appointment_completed_charge_membership ya existe';
  END IF;
END $$;