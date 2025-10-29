-- Fase 0: Habilitar extensiones necesarias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fase 1: Habilitar el trigger de cobros automáticos al completar citas
ALTER TABLE appointments 
ENABLE TRIGGER on_appointment_completed_charge_membership;

-- Fase 2: Limpiar suscripciones mal vinculadas (vinculadas a citas no recurrentes)
UPDATE onvopay_subscriptions
SET status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
WHERE id IN (
  SELECT ops.id
  FROM onvopay_subscriptions ops
  JOIN appointments a ON a.id::text = ops.external_reference
  WHERE ops.status = 'active'
    AND (a.recurrence = 'none' OR a.recurrence IS NULL OR a.recurrence = '')
);

-- Fase 3: Configurar cron job de backup para procesar cobros recurrentes diariamente
-- Este job procesará cualquier cobro que el trigger haya fallado en procesar
SELECT cron.schedule(
  'process-recurring-charges-daily',
  '0 6 * * *', -- 6 AM diario (Costa Rica time)
  $$
  SELECT net.http_post(
    url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/process-recurring-charges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja3lub3BlY3VleGZhbWVwbW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MzQ1ODAsImV4cCI6MjA2MTAxMDU4MH0.kcS5mx6kSrYqJmU3JIDizIXXsBItQVgxqD2mOa13oqE'
    ),
    body := '{}'::jsonb
  );
  $$
);