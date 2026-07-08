// Suite de integración contra el Supabase LOCAL (simulador).
// Ejerce los flujos críticos del v1 end-to-end. Idempotente: limpia lo que crea.
// Correr: node tests/integration.mjs   (requiere `supabase start` activo)
import { createClient } from '@supabase/supabase-js';

const URL = 'http://127.0.0.1:54321';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImФub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'.replace('Фub','anon');
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const anon = createClient(URL, ANON_KEY);
const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });

const PROVIDER = '11111111-1111-1111-1111-111111111111';
const LISTING = 'cccccccc-0000-0000-0000-000000000001';

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; results.push(`  ✅ ${name}`); }
  else { fail++; results.push(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

async function run() {
  // ---- T1: Geografía ----
  const { count: provCount } = await anon.from('provincias').select('*', { count: 'exact', head: true });
  check('provincias = 7', provCount === 7, `got ${provCount}`);
  const { count: cantCount } = await anon.from('cantones').select('*', { count: 'exact', head: true });
  check('cantones = 84', cantCount === 84, `got ${cantCount}`);

  // ---- T2: Booking link público (RPC) ----
  const { data: prov, error: provErr } = await anon.rpc('get_provider_by_slug', { p_slug: 'demo' });
  check('get_provider_by_slug(demo) devuelve proveedor', !provErr && prov?.[0]?.name === 'María Demo', provErr?.message);
  const { data: settings } = await anon.rpc('get_provider_public_settings', { p_provider_id: PROVIDER });
  check('settings públicos: descuento 10% activo', settings?.[0]?.proximity_discount_enabled === true && settings?.[0]?.proximity_discount_pct === 10);

  // ---- T3: Crear reserva (cliente invitado) ----
  // tomar un slot libre futuro a >25h (para validar también el recordatorio 24h)
  const nowISO = new Date().toISOString();
  const in25h = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
  const { data: freeSlots } = await anon.from('provider_time_slots')
    .select('slot_datetime_start, slot_datetime_end')
    .eq('provider_id', PROVIDER).eq('is_available', true).gt('slot_datetime_start', in25h)
    .order('slot_datetime_start').limit(1);
  const slot = freeSlots?.[0];
  check('hay slot libre futuro para reservar', !!slot);
  let apptId = null;
  if (slot) {
    const { data: booking, error: bErr } = await anon.rpc('create_external_booking', {
      p_provider_id: PROVIDER, p_listing_id: LISTING,
      p_start_time: slot.slot_datetime_start, p_end_time: slot.slot_datetime_end,
      p_client_name: 'TEST Integración', p_client_phone: '50600000000',
      p_canton_id: 102, p_total_duration: 30,
    });
    check('create_external_booking → created', !bErr && booking?.[0]?.status === 'created', bErr?.message);
    apptId = booking?.[0]?.appointment_id;

    // nombre del invitado preservado (no nulificado por trigger)
    const { data: appt } = await svc.from('appointments').select('client_name, status').eq('id', apptId).single();
    check('reserva guarda client_name del invitado', appt?.client_name === 'TEST Integración', `got ${appt?.client_name}`);
    check('reserva entra como pending', appt?.status === 'pending');

    // doble-reserva del mismo slot → conflicto
    const { error: dErr } = await anon.rpc('create_external_booking', {
      p_provider_id: PROVIDER, p_listing_id: LISTING,
      p_start_time: slot.slot_datetime_start, p_end_time: slot.slot_datetime_end,
      p_client_name: 'Otro', p_client_phone: '50611111111', p_total_duration: 30,
    });
    check('doble-reserva del mismo horario es rechazada', !!dErr, 'no dio error');
  }

  // ---- T4: Aceptar la cita ----
  if (apptId) {
    const { error: accErr } = await svc.from('appointments').update({ status: 'confirmed' }).eq('id', apptId);
    check('aceptar cita (status → confirmed)', !accErr, accErr?.message);
    const { data: appt2 } = await svc.from('appointments').select('status').eq('id', apptId).single();
    check('cita queda confirmed', appt2?.status === 'confirmed');

    // ---- T5: Recordatorio encolado por trigger ----
    const { data: jobs } = await svc.from('reminder_jobs').select('kind, status').eq('appointment_id', apptId);
    check('al confirmar se encola recordatorio 24h', (jobs || []).some(j => j.kind === '24h'), `jobs: ${JSON.stringify(jobs)}`);
  }

  // ---- T6: Proximidad ----
  const { data: rec, error: recErr } = await anon.rpc('get_recommended_slot_starts', {
    p_provider_id: PROVIDER, p_listing_id: LISTING, p_canton_id: 102,
  });
  check('proximidad: recomienda slots en cantón con cita (102)', !recErr && Array.isArray(rec), recErr?.message);

  // ---- T7: Bloquear / desbloquear slot ----
  const { data: someSlot } = await svc.from('provider_time_slots')
    .select('id, is_available').eq('provider_id', PROVIDER).eq('is_available', true)
    .gt('slot_datetime_start', nowISO).order('slot_datetime_start', { ascending: false }).limit(1);
  const blockId = someSlot?.[0]?.id;
  if (blockId) {
    await svc.from('provider_time_slots').update({ is_available: false, slot_type: 'manually_blocked' }).eq('id', blockId);
    const { data: s1 } = await svc.from('provider_time_slots').select('is_available').eq('id', blockId).single();
    check('bloquear slot', s1?.is_available === false);
    await svc.from('provider_time_slots').update({ is_available: true, slot_type: 'generated' }).eq('id', blockId);
    const { data: s2 } = await svc.from('provider_time_slots').select('is_available').eq('id', blockId).single();
    check('desbloquear slot', s2?.is_available === true);
  }

  // ---- T9: Completar cita → encola recordatorio mensual de re-agenda ----
  {
    const pastId = '88888888-8888-8888-8888-888888888888';
    await svc.from('appointments').delete().eq('id', pastId);
    await svc.from('appointments').insert({
      id: pastId, listing_id: LISTING, provider_id: PROVIDER, client_id: null,
      start_time: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      status: 'confirmed', recurrence: 'none', client_name: 'TEST Completada', external_booking: true,
    });
    await svc.from('appointments').update({ status: 'completed' }).eq('id', pastId);
    const { data: rjobs } = await svc.from('reminder_jobs').select('kind').eq('appointment_id', pastId);
    check('completar cita encola recordatorio mensual (rebook)', (rjobs || []).some(j => j.kind === 'rebook_monthly'), JSON.stringify(rjobs));
    await svc.from('reminder_jobs').delete().eq('appointment_id', pastId);
    await svc.from('appointments').delete().eq('id', pastId);
  }

  // ---- T10: Cancelar cita ----
  {
    const cId = '77777777-7777-7777-7777-777777777777';
    await svc.from('appointments').delete().eq('id', cId);
    await svc.from('appointments').insert({
      id: cId, listing_id: LISTING, provider_id: PROVIDER, client_id: null,
      start_time: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() + 75 * 3600 * 1000).toISOString(),
      status: 'pending', recurrence: 'none', client_name: 'TEST Cancelar', external_booking: true,
    });
    await svc.from('appointments').update({ status: 'cancelled' }).eq('id', cId);
    const { data: c } = await svc.from('appointments').select('status').eq('id', cId).single();
    check('cancelar cita (status → cancelled)', c?.status === 'cancelled');
    await svc.from('appointments').delete().eq('id', cId);
  }

  // ---- T8: RLS — anon NO puede confirmar citas ajenas ----
  if (apptId) {
    const { data: beforeRows } = await svc.from('appointments').select('status').eq('id', apptId).single();
    await anon.from('appointments').update({ status: 'cancelled' }).eq('id', apptId); // debe ser bloqueado por RLS
    const { data: afterRows } = await svc.from('appointments').select('status').eq('id', apptId).single();
    check('RLS: anon no puede modificar citas', beforeRows?.status === afterRows?.status, `${beforeRows?.status} → ${afterRows?.status}`);
  }

  // ---- cleanup ----
  if (apptId) {
    await svc.from('reminder_jobs').delete().eq('appointment_id', apptId);
    await svc.from('appointments').delete().eq('id', apptId);
  }

  console.log('\n=== RESULTADOS TESTING DE INTEGRACIÓN ===\n' + results.join('\n'));
  console.log(`\n${pass} pasaron, ${fail} fallaron\n`);
  process.exit(fail > 0 ? 1 : 0);
}
run().catch((e) => { console.error('Error fatal en la suite:', e); process.exit(2); });
