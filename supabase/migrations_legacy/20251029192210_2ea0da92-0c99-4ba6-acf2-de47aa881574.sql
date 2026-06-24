-- Agregar columna para vincular appointments con subscriptions
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS onvopay_subscription_id UUID REFERENCES onvopay_subscriptions(id);

-- Índice para búsquedas rápidas por suscripción
CREATE INDEX IF NOT EXISTS idx_appointments_subscription 
ON appointments(onvopay_subscription_id) 
WHERE onvopay_subscription_id IS NOT NULL;

-- Comentario
COMMENT ON COLUMN appointments.onvopay_subscription_id IS 
  'ID de la suscripción recurrente asociada (si aplica)';

-- Actualizar función del trigger para usar onvopay_subscription_id
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
    
    -- ✅ NUEVA BÚSQUEDA: Usar onvopay_subscription_id directamente
    IF NEW.onvopay_subscription_id IS NOT NULL THEN
      SELECT * INTO subscription_record
      FROM onvopay_subscriptions
      WHERE id = NEW.onvopay_subscription_id
        AND status = 'active'
      LIMIT 1;
    END IF;
    
    -- Si no encontró por ID directo, buscar por external_reference (fallback)
    IF subscription_record.id IS NULL THEN
      SELECT * INTO subscription_record
      FROM onvopay_subscriptions
      WHERE external_reference = NEW.id::text
        AND status = 'active'
      LIMIT 1;
    END IF;
    
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

-- Migrar suscripciones existentes para vincularlas correctamente
UPDATE appointments a
SET onvopay_subscription_id = s.id
FROM onvopay_subscriptions s
WHERE s.external_reference = a.id::text
  AND s.status = 'active'
  AND a.onvopay_subscription_id IS NULL;