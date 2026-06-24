-- Recordatorios automáticos (concepto v1) — F6, pilar #2
-- Cola de recordatorios + encolado automático al confirmar la cita, según los toggles
-- del proveedor (provider_settings). Los envía la edge function send-reminders (cron).
-- Ver docs/CONCEPTO_V1.md §5.6 y §9

CREATE TABLE IF NOT EXISTS public.reminder_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('24h', '2h', 'rebook_monthly')),
  send_at         timestamptz NOT NULL,
  sent_at         timestamptz,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  error_details   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Evita duplicar un mismo recordatorio para la misma cita
  UNIQUE (appointment_id, kind)
);

-- El cron busca los pendientes vencidos
CREATE INDEX IF NOT EXISTS idx_reminder_jobs_due
  ON public.reminder_jobs(send_at) WHERE status = 'pending';

ALTER TABLE public.reminder_jobs ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: solo las edge functions (service_role) operan la cola.

-- ============================================================
-- Encolar recordatorios al confirmar / completar la cita
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_appointment_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_24h boolean := true;
  v_2h boolean := false;
BEGIN
  -- Al pasar a 'confirmed': programar recordatorios 24h / 2h antes
  IF NEW.status = 'confirmed' AND COALESCE(OLD.status, '') <> 'confirmed' THEN
    SELECT COALESCE(ps.reminder_24h_enabled, true), COALESCE(ps.reminder_2h_enabled, false)
      INTO v_24h, v_2h
    FROM provider_settings ps WHERE ps.provider_id = NEW.provider_id;
    v_24h := COALESCE(v_24h, true);
    v_2h := COALESCE(v_2h, false);

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
  END IF;

  -- Al completarse: recordatorio para agendar el próximo mes (retención)
  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' THEN
    INSERT INTO reminder_jobs (appointment_id, kind, send_at)
    VALUES (NEW.id, 'rebook_monthly', NEW.end_time + interval '30 days')
    ON CONFLICT (appointment_id, kind) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_appointment_reminders ON public.appointments;
CREATE TRIGGER trg_enqueue_appointment_reminders
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_appointment_reminders();
