-- Mejorar trigger para cobro automático de citas recurrentes
-- Este trigger dispara cuando una cita cambia a 'completed' y es recurrente

CREATE OR REPLACE FUNCTION trigger_membership_charge_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_id UUID;
  v_http_response_id BIGINT;
  v_supabase_url TEXT := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key TEXT := current_setting('app.settings.supabase_anon_key', true);
BEGIN
  -- Solo procesar cuando cambia a completed y es recurrente
  IF NEW.status = 'completed' 
     AND OLD.status IS DISTINCT FROM 'completed'
     AND (NEW.recurrence IS NOT NULL AND NEW.recurrence != 'none' OR NEW.is_recurring_instance = true)
  THEN
    RAISE LOG '🎯 Trigger: Appointment % completed (recurrence: %, is_recurring: %)', 
      NEW.id, NEW.recurrence, NEW.is_recurring_instance;

    -- Buscar suscripción activa, priorizando recurring_rule_id
    IF NEW.recurring_rule_id IS NOT NULL THEN
      SELECT id INTO v_subscription_id
      FROM onvopay_subscriptions
      WHERE recurring_rule_id = NEW.recurring_rule_id
        AND status = 'active'
        AND payment_method_id IS NOT NULL
      LIMIT 1;

      RAISE LOG '🔍 Subscription search by recurring_rule_id (%): %', 
        NEW.recurring_rule_id, 
        COALESCE(v_subscription_id::TEXT, 'NOT FOUND');
    END IF;

    -- Fallback: buscar por client_id + provider_id
    IF v_subscription_id IS NULL THEN
      SELECT id INTO v_subscription_id
      FROM onvopay_subscriptions
      WHERE client_id = NEW.client_id
        AND provider_id = NEW.provider_id
        AND status = 'active'
        AND payment_method_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1;

      RAISE LOG '🔍 Subscription search fallback (client/provider): %', 
        COALESCE(v_subscription_id::TEXT, 'NOT FOUND');
    END IF;

    -- Si no hay suscripción, solo log (no fallar)
    IF v_subscription_id IS NULL THEN
      RAISE LOG '⚠️ No active subscription found for appointment %, skipping charge', NEW.id;
      RETURN NEW;
    END IF;

    -- Llamar a onvopay-process-membership-charge asíncronamente
    BEGIN
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/onvopay-process-membership-charge',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_supabase_anon_key
        ),
        body := jsonb_build_object(
          'subscription_id', v_subscription_id,
          'appointment_id', NEW.id
        )
      ) INTO v_http_response_id;

      RAISE LOG '✅ Membership charge request queued for appointment % (subscription: %, request_id: %)', 
        NEW.id, v_subscription_id, v_http_response_id;

    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '❌ Error queuing membership charge for appointment %: %', NEW.id, SQLERRM;
      -- No fallar el trigger, solo loggear
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_appointment_completed_charge_subscription ON appointments;

CREATE TRIGGER on_appointment_completed_charge_subscription
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_membership_charge_on_completion();