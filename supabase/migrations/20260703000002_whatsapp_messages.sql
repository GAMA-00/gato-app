-- Tabla de auditoría de mensajes WhatsApp (Cloud API).
-- La escriben solo las edge functions (service role); sin acceso anon/authenticated.
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction      text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  to_phone       text,
  from_phone     text,
  template       text,
  body           text,
  status         text NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'received', 'failed')),
  wa_message_id  text,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  error_details  jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_id ON public.whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_appointment ON public.whatsapp_messages(appointment_id);

-- RLS activo sin políticas: solo el service role (edge functions) puede leer/escribir.
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
