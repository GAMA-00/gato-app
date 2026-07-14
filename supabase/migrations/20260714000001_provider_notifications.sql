-- Notificaciones WhatsApp al proveedor:
--  1. Nueva solicitud de reserva (siempre; se dispara desde el frontend)
--  2. Agenda diaria a las 6:00 AM CR (opcional, toggle)
--  3. Recordatorio 1 h antes de cada cita (opcional, toggle)

-- Toggles en provider_settings (default ON)
ALTER TABLE public.provider_settings
  ADD COLUMN IF NOT EXISTS notify_daily_agenda boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_1h_before boolean NOT NULL DEFAULT true;

-- Nuevo kind en reminder_jobs para el recordatorio al proveedor
ALTER TABLE public.reminder_jobs DROP CONSTRAINT IF EXISTS reminder_jobs_kind_check;
ALTER TABLE public.reminder_jobs ADD CONSTRAINT reminder_jobs_kind_check
  CHECK (kind = ANY (ARRAY['24h'::text, '2h'::text, 'rebook_monthly'::text, 'provider_1h'::text]));

-- Extender el trigger de encolado: al confirmar, programar tambien provider_1h
CREATE OR REPLACE FUNCTION public.enqueue_appointment_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_24h boolean := true;
  v_2h boolean := false;
  v_prov_1h boolean := true;
BEGIN
  IF NEW.status = 'confirmed' AND COALESCE(OLD.status, '') <> 'confirmed' THEN
    SELECT COALESCE(ps.reminder_24h_enabled, true),
           COALESCE(ps.reminder_2h_enabled, false),
           COALESCE(ps.notify_1h_before, true)
      INTO v_24h, v_2h, v_prov_1h
    FROM provider_settings ps WHERE ps.provider_id = NEW.provider_id;
    v_24h := COALESCE(v_24h, true);
    v_2h := COALESCE(v_2h, false);
    v_prov_1h := COALESCE(v_prov_1h, true);

    IF v_24h AND NEW.start_time - interval '24 hours' > now() THEN
      INSERT INTO reminder_jobs (appointment_id, kind, send_at)
      VALUES (NEW.id, '24h', NEW.start_time - interval '24 hours')
      ON CONFLICT (appointment_id, kind) DO NOTHING;
    END IF;

    IF v_2h AND NEW.start_time - interval '2 hours' > now() THEN
      INSERT INTO reminder_jobs (appointment_id, kind, send_at)
      VALUES (NEW.id, '2h', NEW.start_time - interval '2 hours')
      ON CONFLICT (appointment_id, kind) DO NOTHING;
    END IF;

    -- Recordatorio al PROVEEDOR 1 h antes (salir con anticipacion)
    IF v_prov_1h AND NEW.start_time - interval '1 hour' > now() THEN
      INSERT INTO reminder_jobs (appointment_id, kind, send_at)
      VALUES (NEW.id, 'provider_1h', NEW.start_time - interval '1 hour')
      ON CONFLICT (appointment_id, kind) DO NOTHING;
    END IF;
  END IF;

  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' THEN
    INSERT INTO reminder_jobs (appointment_id, kind, send_at)
    VALUES (NEW.id, 'rebook_monthly', NEW.end_time + interval '30 days')
    ON CONFLICT (appointment_id, kind) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Cron: agenda diaria a las 6:00 AM Costa Rica (12:00 UTC).
-- Condicional: pg_cron solo existe en el proyecto Supabase hosted (no en local).
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('send-daily-agenda-6am');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'send-daily-agenda-6am',
      '0 12 * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://jckynopecuexfamepmoh.supabase.co/functions/v1/send-daily-agenda',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $outer$;
