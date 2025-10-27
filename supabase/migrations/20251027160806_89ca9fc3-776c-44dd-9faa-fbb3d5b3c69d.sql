-- =====================================================
-- MIGRACIÓN: Sistema de Cobros Recurrentes Automáticos
-- =====================================================
-- Implementa:
-- 1. Trigger para cobrar al completar appointment
-- 2. Función RPC para cancelar membresía
-- 3. Función RPC para saltar próximo cobro
-- =====================================================

-- =====================================================
-- 1. TRIGGER FUNCTION: Procesar cobro al completar appointment
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
  v_supabase_url TEXT;
  v_anon_key TEXT;
BEGIN
  -- Solo ejecutar si el appointment cambió a 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    RAISE LOG '🔍 Appointment % completado, verificando membresía...', NEW.id;
    
    -- Buscar suscripción activa asociada a este appointment
    SELECT * INTO subscription_record
    FROM onvopay_subscriptions
    WHERE external_reference = NEW.id::text
      AND status = 'active'
    LIMIT 1;
    
    -- Si existe suscripción, procesar cobro recurrente
    IF subscription_record.id IS NOT NULL THEN
      
      RAISE LOG '🎯 Membresía detectada para appointment %. Procesando cobro recurrente...', NEW.id;
      RAISE LOG '📋 Subscription ID: %, Next charge date: %', subscription_record.id, subscription_record.next_charge_date;
      
      -- Construir URL de la edge function
      v_supabase_url := current_setting('app.supabase_url', true);
      v_anon_key := current_setting('app.supabase_anon_key', true);
      
      -- Fallback si no están configurados
      IF v_supabase_url IS NULL THEN
        v_supabase_url := 'https://jckynopecuexfamepmoh.supabase.co';
      END IF;
      
      IF v_anon_key IS NULL THEN
        v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MzQ1ODAsImV4cCI6MjA2MTAxMDU4MH0.kcS5mx6kSrYqJmU3JIDizIXXsBItQVgxqD2mOa13oqE';
      END IF;
      
      v_function_url := v_supabase_url || '/functions/v1/onvopay-process-membership-charge';
      
      -- Llamar a la edge function de forma asíncrona usando pg_net
      PERFORM net.http_post(
        url := v_function_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_anon_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'subscription_id', subscription_record.id,
          'appointment_id', NEW.id
        )
      );
      
      RAISE LOG '✅ Llamada a onvopay-process-membership-charge iniciada para subscription %', subscription_record.id;
      
    ELSE
      RAISE LOG '📝 No hay membresía activa asociada al appointment %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- No romper el flujo si falla, solo loguear
    RAISE WARNING '⚠️ Error en trigger_membership_charge_on_completion: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Crear el trigger (reemplazar si existe)
DROP TRIGGER IF EXISTS on_appointment_completed_charge_membership ON appointments;

CREATE TRIGGER on_appointment_completed_charge_membership
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_membership_charge_on_completion();

COMMENT ON TRIGGER on_appointment_completed_charge_membership ON appointments IS 
  'Trigger que procesa cobros recurrentes automáticamente cuando un appointment con membresía se completa';

-- =====================================================
-- 2. RPC FUNCTION: Cancelar membresía
-- =====================================================

CREATE OR REPLACE FUNCTION cancel_membership_subscription(
  p_subscription_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_result jsonb;
BEGIN
  -- Obtener la suscripción y validar que pertenece al cliente
  SELECT * INTO v_subscription
  FROM onvopay_subscriptions
  WHERE id = p_subscription_id
    AND client_id = auth.uid()
    AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SUBSCRIPTION_NOT_FOUND',
      'message', 'Suscripción no encontrada o ya cancelada'
    );
  END IF;
  
  -- Cancelar la suscripción
  UPDATE onvopay_subscriptions
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_subscription_id;
  
  RAISE LOG '🚫 Membresía cancelada por cliente: subscription_id=%, client_id=%', 
    p_subscription_id, auth.uid();
  
  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', p_subscription_id,
    'cancelled_at', NOW(),
    'message', 'Membresía cancelada exitosamente'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Error cancelando membresía: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CANCELLATION_ERROR',
      'message', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION cancel_membership_subscription IS 
  'Permite al cliente cancelar su membresía activa';

-- =====================================================
-- 3. RPC FUNCTION: Saltar próximo cobro
-- =====================================================

CREATE OR REPLACE FUNCTION skip_next_membership_charge(
  p_subscription_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_new_next_charge_date DATE;
BEGIN
  -- Obtener la suscripción y validar que pertenece al cliente
  SELECT * INTO v_subscription
  FROM onvopay_subscriptions
  WHERE id = p_subscription_id
    AND client_id = auth.uid()
    AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SUBSCRIPTION_NOT_FOUND',
      'message', 'Suscripción no encontrada o no activa'
    );
  END IF;
  
  -- Calcular nueva next_charge_date (saltar un intervalo)
  v_new_next_charge_date := CASE 
    WHEN v_subscription.interval_type = 'weekly' THEN 
      v_subscription.next_charge_date + (v_subscription.interval_count * 7)
    WHEN v_subscription.interval_type = 'biweekly' THEN 
      v_subscription.next_charge_date + (v_subscription.interval_count * 14)
    WHEN v_subscription.interval_type = 'triweekly' THEN 
      v_subscription.next_charge_date + (v_subscription.interval_count * 21)
    WHEN v_subscription.interval_type = 'monthly' THEN 
      v_subscription.next_charge_date + (INTERVAL '1 month' * v_subscription.interval_count)
    ELSE
      v_subscription.next_charge_date + 7 -- fallback
  END;
  
  -- Actualizar next_charge_date
  UPDATE onvopay_subscriptions
  SET 
    next_charge_date = v_new_next_charge_date,
    updated_at = NOW()
  WHERE id = p_subscription_id;
  
  RAISE LOG '⏭️ Próximo cobro saltado: subscription_id=%, old_date=%, new_date=%', 
    p_subscription_id, v_subscription.next_charge_date, v_new_next_charge_date;
  
  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', p_subscription_id,
    'previous_charge_date', v_subscription.next_charge_date,
    'new_charge_date', v_new_next_charge_date,
    'message', 'Próximo cobro reprogramado exitosamente'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Error saltando cobro: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SKIP_ERROR',
      'message', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION skip_next_membership_charge IS 
  'Permite al cliente saltar el próximo cobro programado de su membresía';

-- =====================================================
-- 4. Grants para seguridad
-- =====================================================

-- Permitir a usuarios autenticados ejecutar las funciones RPC
GRANT EXECUTE ON FUNCTION cancel_membership_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION skip_next_membership_charge(UUID) TO authenticated;