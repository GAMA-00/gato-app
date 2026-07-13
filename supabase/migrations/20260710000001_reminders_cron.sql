-- Cron: ejecutar send-reminders cada 15 min para drenar reminder_jobs vencidos.
-- Usa pg_cron + pg_net (ambos disponibles en Supabase).
-- La función send-reminders tiene verify_jwt=false (la invoca el scheduler).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotente: quitar el job previo si existe
DO $$
BEGIN
  PERFORM cron.unschedule('send-reminders-every-15min');
EXCEPTION WHEN OTHERS THEN
  NULL; -- no existía
END $$;

SELECT cron.schedule(
  'send-reminders-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
