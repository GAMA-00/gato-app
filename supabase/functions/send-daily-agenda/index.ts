import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Agenda diaria del proveedor (cron 6:00 AM CR / 12:00 UTC).
// Envía por WhatsApp la lista de citas confirmadas del día a cada proveedor
// con notify_daily_agenda activo. Plantilla: agenda_diaria_proveedor
// ({{1}} nombre, {{2}} cantidad, {{3}} lista en una línea).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TZ = 'America/Costa_Rica';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function crDayRangeUtc(): { start: string; end: string } {
  // "Hoy" en Costa Rica (UTC-6, sin DST)
  const now = new Date();
  const crNow = new Date(now.getTime() - 6 * 3600_000);
  const y = crNow.getUTCFullYear(), m = crNow.getUTCMonth(), d = crNow.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 6, 0, 0)); // 00:00 CR = 06:00 UTC
  const end = new Date(start.getTime() + 24 * 3600_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

const hora = (iso: string) =>
  new Intl.DateTimeFormat('es-CR', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso));

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const results = { providers: 0, sent: 0, failed: 0 };

  try {
    const { start, end } = crDayRangeUtc();

    // Citas confirmadas de hoy, con datos del cliente
    const { data: appts, error } = await supabase
      .from('appointments')
      .select('id, provider_id, client_name, client_address, start_time, custom_variable_selections, listings(title)')
      .eq('status', 'confirmed')
      .gte('start_time', start)
      .lt('start_time', end)
      .order('start_time');
    if (error) throw error;
    if (!appts?.length) {
      return new Response(JSON.stringify({ success: true, ...results, note: 'sin citas hoy' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Agrupar por proveedor
    const byProvider = new Map<string, any[]>();
    for (const a of appts) {
      if (!byProvider.has(a.provider_id)) byProvider.set(a.provider_id, []);
      byProvider.get(a.provider_id)!.push(a);
    }

    for (const [providerId, list] of byProvider) {
      results.providers++;

      // Toggle + teléfono del proveedor
      const [{ data: settings }, { data: prov }] = await Promise.all([
        supabase.from('provider_settings').select('notify_daily_agenda').eq('provider_id', providerId).maybeSingle(),
        supabase.from('users').select('name, phone').eq('id', providerId).single(),
      ]);
      if (settings && settings.notify_daily_agenda === false) continue;
      if (!prov?.phone) continue;

      // Lista compacta en una línea (las variables de plantilla no permiten saltos de línea)
      const items = list.slice(0, 4).map((a: any) => {
        const servicio = a.custom_variable_selections?.cart?.[0]?.name ?? a.listings?.title ?? 'servicio';
        const lugar = a.client_address ? ` en ${String(a.client_address).split('·')[0].trim()}` : '';
        return `${hora(a.start_time)} ${a.client_name ?? 'cliente'} (${servicio})${lugar}`;
      });
      if (list.length > 4) items.push(`y ${list.length - 4} más`);
      const lista = items.join(' | ');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: prov.phone,
          type: 'template',
          template: 'agenda_diaria_proveedor',
          params: [(prov.name ?? 'proveedor').split(' ')[0], String(list.length), lista],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) results.sent++;
      else results.failed++;
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('send-daily-agenda error:', message);
    return new Response(JSON.stringify({ success: false, error: message, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
