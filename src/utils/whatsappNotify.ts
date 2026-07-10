import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Notificaciones WhatsApp (Cloud API) vía edge function `whatsapp-send`.
 * Fire-and-forget: un fallo de WhatsApp NUNCA debe romper el flujo de reserva.
 * Plantillas aprobadas en Meta (idioma 'es'):
 *  - solicitud_reserva:  {{1}} nombre, {{2}} proveedor, {{3}} fecha, {{4}} horario, {{5}} precio
 *  - reserva_confirmada: {{1}} nombre, {{2}} proveedor, {{3}} fecha, {{4}} horario, {{5}} precio, {{6}} dirección
 */

const TZ = 'America/Costa_Rica';

export const waFecha = (iso: string) =>
  new Intl.DateTimeFormat('es-CR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(iso));

export const waHora = (iso: string) =>
  new Intl.DateTimeFormat('es-CR', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso));

export const waHorario = (startIso: string, endIso: string) =>
  `${waHora(startIso)} – ${waHora(endIso)}`;

export const waPrecio = (n: number | null | undefined) =>
  n == null ? '' : `₡${Number(n).toLocaleString('es-CR')}`;

async function sendTemplate(to: string, template: string, params: string[], appointmentId?: string) {
  try {
    const { error } = await supabase.functions.invoke('whatsapp-send', {
      body: { to, type: 'template', template, params, appointment_id: appointmentId },
    });
    if (error) logger.error(`whatsapp-send ${template} falló`, error);
  } catch (e) {
    logger.error(`whatsapp-send ${template} exception`, e);
  }
}

/** Al cliente cuando envía una solicitud de reserva. */
export function notifySolicitudReserva(opts: {
  clientPhone: string;
  clientName: string;
  providerName: string;
  startIso: string;
  endIso: string;
  price: number | null | undefined;
  appointmentId?: string;
}) {
  const nombre = opts.clientName.split(' ')[0] || opts.clientName;
  void sendTemplate(opts.clientPhone, 'solicitud_reserva', [
    nombre,
    opts.providerName,
    waFecha(opts.startIso),
    waHorario(opts.startIso, opts.endIso),
    waPrecio(opts.price),
  ], opts.appointmentId);
}

/** Al cliente cuando el proveedor acepta la solicitud. */
export function notifyReservaConfirmada(opts: {
  clientPhone: string;
  clientName: string;
  providerName: string;
  startIso: string;
  endIso: string;
  price: number | null | undefined;
  address: string;
  appointmentId?: string;
}) {
  const nombre = opts.clientName.split(' ')[0] || opts.clientName;
  void sendTemplate(opts.clientPhone, 'reserva_confirmada', [
    nombre,
    opts.providerName,
    waFecha(opts.startIso),
    waHorario(opts.startIso, opts.endIso),
    waPrecio(opts.price),
    opts.address || 'la dirección indicada',
  ], opts.appointmentId);
}
