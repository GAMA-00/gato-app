import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// WhatsApp Cloud API — envío de mensajes (concepto v1)
// Canal único de comunicación con el cliente. Soporta plantillas (fuera de la ventana
// de 24h) y texto libre (dentro de la ventana). Registra todo en whatsapp_messages.
// Ver docs/skills/SKILL_WHATSAPP_MESSAGING.md

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN');
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
const GRAPH_VERSION = Deno.env.get('WHATSAPP_GRAPH_VERSION') ?? 'v21.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Normaliza a E.164 sin '+'. Para CR (8 dígitos) antepone 506. */
function normalizePhone(raw: string): string {
  let p = (raw ?? '').replace(/[^\d]/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (/^\d{8}$/.test(p)) p = `506${p}`; // número CR local
  return p;
}

interface SendRequest {
  to: string;
  type?: 'template' | 'text';
  template?: string;       // requerido si type = 'template'
  language?: string;       // default 'es'
  params?: string[];       // parámetros del body de la plantilla
  body?: string;           // requerido si type = 'text'
  appointment_id?: string; // para enlazar el mensaje a una cita
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let logId: string | null = null;

  try {
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      throw new Error('WhatsApp no configurado: faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID');
    }

    const payload = (await req.json()) as SendRequest;
    const type = payload.type ?? 'template';
    const to = normalizePhone(payload.to);
    if (!to) throw new Error('Falta el número de destino (to)');

    // 1. Registrar el intento (status queued) antes de enviar
    const { data: logRow } = await supabase
      .from('whatsapp_messages')
      .insert({
        direction: 'outbound',
        to_phone: to,
        template: type === 'template' ? payload.template : null,
        body: type === 'text' ? payload.body : null,
        status: 'queued',
        appointment_id: payload.appointment_id ?? null,
      })
      .select('id')
      .single();
    logId = logRow?.id ?? null;

    // 2. Construir el cuerpo según el tipo
    let messageBody: Record<string, unknown>;
    if (type === 'template') {
      if (!payload.template) throw new Error('type=template requiere "template"');
      messageBody = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: payload.template,
          language: { code: payload.language ?? 'es' },
          components: payload.params?.length
            ? [{ type: 'body', parameters: payload.params.map((text) => ({ type: 'text', text })) }]
            : undefined,
        },
      };
    } else {
      if (!payload.body) throw new Error('type=text requiere "body"');
      messageBody = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: payload.body },
      };
    }

    // 3. Enviar a la Graph API
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody),
    });
    const data = await res.json();

    if (!res.ok) {
      if (logId) {
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed', error_details: data })
          .eq('id', logId);
      }
      console.error('WhatsApp send failed:', JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    // 4. Guardar el wa_message_id y marcar enviado
    const waMessageId = data?.messages?.[0]?.id ?? null;
    if (logId) {
      await supabase
        .from('whatsapp_messages')
        .update({ status: 'sent', wa_message_id: waMessageId })
        .eq('id', logId);
    }

    return new Response(JSON.stringify({ success: true, wa_message_id: waMessageId, log_id: logId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (logId) {
      await supabase
        .from('whatsapp_messages')
        .update({ status: 'failed', error_details: { message } })
        .eq('id', logId);
    }
    console.error('whatsapp-send error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
