import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Recordatorios automáticos (concepto v1) — F6, pilar #2
// Cron (cada ~15 min): toma reminder_jobs vencidos y los envía por WhatsApp reusando
// la función whatsapp-send. Ver docs/CONCEPTO_V1.md §9 y SKILL_WHATSAPP_MESSAGING.md

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plantilla + parámetros por tipo de recordatorio (deben coincidir con las aprobadas en Meta)
// Plantilla activa: recordatorio_cita — {{1}} nombre, {{2}} servicio, {{3}} proveedor, {{4}} fecha, {{5}} hora
function buildMessage(kind: string, apt: any): { template: string; params: string[] } {
  const tz = 'America/Costa_Rica';
  const start = new Date(apt.start_time);
  const hora = new Intl.DateTimeFormat('es-CR', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(start);
  const fecha = new Intl.DateTimeFormat('es-CR', {
    timeZone: tz, weekday: 'long', day: 'numeric', month: 'long',
  }).format(start);
  const proveedor = apt.provider_name ?? 'tu proveedor';
  const nombre = (apt.client_name ?? 'cliente').split(' ')[0];
  const servicio = apt.custom_variable_selections?.cart?.[0]?.name
    ?? apt.listings?.title ?? 'tu servicio';

  switch (kind) {
    case 'provider_1h':
      // {{1}} proveedor, {{2}} cliente, {{3}} servicio, {{4}} hora, {{5}} direccion
      return {
        template: 'salida_proxima_proveedor',
        params: [
          (proveedor).split(' ')[0],
          apt.client_name ?? 'cliente',
          servicio,
          hora,
          apt.client_address ?? 'la direccion indicada',
        ],
      };
    case '24h':
    case '2h':
    default:
      return { template: 'recordatorio_cita', params: [nombre, servicio, proveedor, fecha, hora] };
    case 'rebook_monthly':
      // TODO: crear plantilla 'recordatorio_agendar' en Meta antes de activar este kind
      return { template: 'recordatorio_agendar', params: [proveedor] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const results = { processed: 0, sent: 0, failed: 0 };

  try {
    // 1. Recordatorios pendientes vencidos
    const { data: jobs, error } = await supabase
      .from('reminder_jobs')
      .select('id, appointment_id, kind')
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString())
      .limit(50);
    if (error) throw error;

    for (const job of jobs ?? []) {
      results.processed++;

      // 2. Datos de la cita (cliente, hora, proveedor)
      const { data: apt } = await supabase
        .from('appointments')
        .select('id, provider_id, client_phone, client_name, client_address, provider_name, start_time, status, custom_variable_selections, listings(title)')
        .eq('id', job.appointment_id)
        .single();

      if (!apt || ['cancelled', 'rejected'].includes(apt.status)) {
        await supabase.from('reminder_jobs')
          .update({ status: 'skipped', sent_at: new Date().toISOString() })
          .eq('id', job.id);
        continue;
      }

      // provider_1h va al PROVEEDOR; el resto al cliente
      let toPhone = apt.client_phone;
      if (job.kind === 'provider_1h') {
        const { data: prov } = await supabase
          .from('users').select('phone').eq('id', apt.provider_id).single();
        toPhone = prov?.phone ?? null;
      }
      if (!toPhone || toPhone === 'Sin teléfono') {
        await supabase.from('reminder_jobs')
          .update({ status: 'skipped', sent_at: new Date().toISOString() })
          .eq('id', job.id);
        continue;
      }

      const { template, params } = buildMessage(job.kind, apt);

      // 3. Enviar reusando whatsapp-send (server-to-server con service role)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: toPhone,
          type: 'template',
          template,
          params,
          appointment_id: apt.id,
        }),
      });
      const sendData = await res.json().catch(() => ({}));

      if (res.ok && sendData?.success) {
        await supabase.from('reminder_jobs')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', job.id);
        results.sent++;
      } else {
        await supabase.from('reminder_jobs')
          .update({ status: 'failed', error_details: sendData })
          .eq('id', job.id);
        results.failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('send-reminders error:', message);
    return new Response(JSON.stringify({ success: false, error: message, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
