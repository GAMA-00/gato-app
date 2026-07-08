-- WhatsApp (concepto v1) — log de mensajes
-- Canal único de comunicación con el cliente. Registra salientes (notificaciones,
-- recordatorios, OTP) y entrantes (respuestas del cliente, que luego se reenvían al
-- proveedor). Ver docs/CONCEPTO_V1.md §5.5 y docs/skills/SKILL_WHATSAPP_MESSAGING.md

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction       text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  to_phone        text,
  from_phone      text,
  template        text,                 -- nombre de plantilla (si aplica)
  body            text,                 -- texto del mensaje
  wa_message_id   text,                 -- id devuelto/recibido de la API de Meta
  status          text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','sent','delivered','read','failed','received')),
  error_details   jsonb,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- El webhook actualiza estados buscando por wa_message_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_id ON public.whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_appointment ON public.whatsapp_messages(appointment_id);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Sin políticas públicas: solo las edge functions (service_role) escriben/leen.
-- service_role omite RLS. La lectura en-app por el proveedor (respuestas entrantes)
-- se habilitará con una política dedicada cuando se construya esa pantalla.

-- Trigger updated_at (función dedicada, siguiendo el patrón del proyecto)
CREATE OR REPLACE FUNCTION public.update_whatsapp_messages_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at ON public.whatsapp_messages;
CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_messages_updated_at();
