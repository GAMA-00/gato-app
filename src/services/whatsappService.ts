import { supabase } from "@/integrations/supabase/client";

/**
 * Servicio de WhatsApp (concepto v1) — wrapper sobre la edge function whatsapp-send.
 * Canal único de comunicación con el cliente.
 * Ver docs/skills/SKILL_WHATSAPP_MESSAGING.md
 */

export type WhatsAppTemplate =
  | "solicitud_recibida"
  | "cita_confirmada"
  | "recordatorio_24h"
  | "recordatorio_2h"
  | "cancelacion_proveedor"
  | "otp_login";

interface SendTemplateArgs {
  to: string;
  template: WhatsAppTemplate;
  params?: string[];
  language?: string;
  appointmentId?: string;
}

interface SendResult {
  success: boolean;
  wa_message_id?: string;
  log_id?: string;
  error?: unknown;
}

/** Envía una plantilla aprobada (para mensajes proactivos / fuera de la ventana de 24h). */
export async function sendWhatsAppTemplate({
  to,
  template,
  params,
  language = "es",
  appointmentId,
}: SendTemplateArgs): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: {
      to,
      type: "template",
      template,
      params,
      language,
      appointment_id: appointmentId,
    },
  });
  if (error) return { success: false, error };
  return data as SendResult;
}

/**
 * Envía texto libre (solo válido dentro de la ventana de 24h tras un mensaje del
 * cliente; fuera de ella Meta lo rechaza y hay que usar plantilla).
 */
export async function sendWhatsAppText(
  to: string,
  body: string,
  appointmentId?: string,
): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("whatsapp-send", {
    body: { to, type: "text", body, appointment_id: appointmentId },
  });
  if (error) return { success: false, error };
  return data as SendResult;
}
