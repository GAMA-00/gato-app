import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// WhatsApp Cloud API — webhook (concepto v1)
// - GET: handshake de verificación de Meta (devuelve hub.challenge).
// - POST: estados de entrega (sent/delivered/read/failed) y mensajes entrantes.
// Ver docs/skills/SKILL_WHATSAPP_MESSAGING.md

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET'); // opcional: verificación de firma
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Verifica la firma X-Hub-Signature-256 (HMAC-SHA256 con el app secret). */
async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!APP_SECRET) return true; // si no hay secret configurado, no se valida (dev)
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected =
    'sha256=' +
    Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  return expected === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // 1. Handshake de verificación (GET)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token && token === VERIFY_TOKEN) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const rawBody = await req.text();

    // 2. Verificar firma de Meta
    const signature = req.headers.get('x-hub-signature-256');
    if (!(await verifySignature(rawBody, signature))) {
      console.warn('WhatsApp webhook: firma inválida');
      return new Response('Invalid signature', { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};

        // 2a. Estados de entrega de mensajes salientes
        for (const status of value.statuses ?? []) {
          const waId = status.id;
          const newStatus = status.status; // sent|delivered|read|failed
          if (!waId) continue;
          await supabase
            .from('whatsapp_messages')
            .update({
              status: newStatus,
              error_details: status.errors ?? null,
            })
            .eq('wa_message_id', waId);
        }

        // 2b. Mensajes entrantes del cliente
        for (const msg of value.messages ?? []) {
          const text =
            msg.text?.body ?? msg.button?.text ?? `[${msg.type ?? 'mensaje'}]`;
          await supabase.from('whatsapp_messages').insert({
            direction: 'inbound',
            from_phone: msg.from,
            body: text,
            wa_message_id: msg.id,
            status: 'received',
          });
          // TODO (fase de notificaciones): reenviar al proveedor como notificación in-app.
        }
      }
    }

    // Meta espera 200 rápido para no reintentar
    return new Response('OK', { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('whatsapp-webhook error:', message);
    // Responder 200 igualmente evita reintentos en bucle por errores de parseo
    return new Response('OK', { status: 200 });
  }
});
