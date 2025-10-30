/**
 * Edge Function: onvopay-sweep-completed-recurring
 * 
 * Barrido automático de citas recurrentes finalizadas sin pago
 * 
 * Responsabilidades:
 * - Buscar citas recurrentes que alcanzaron su end_time y no tienen pago
 * - Resolver su suscripción activa (priorizando recurring_rule_id)
 * - Invocar onvopay-process-membership-charge para cada una
 * - Reportar resumen de cobros procesados/fallidos
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log('🧹 SWEEP RECURRING - Function started', {
    requestId,
    timestamp: new Date().toISOString()
  });

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Buscar citas recurrentes finalizadas sin pago
    const { data: appointments, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        client_id,
        provider_id,
        listing_id,
        start_time,
        end_time,
        status,
        recurrence,
        is_recurring_instance,
        recurring_rule_id,
        onvopay_payment_id,
        client_name,
        listings (
          title,
          service_types (
            name
          )
        )
      `)
      .or('recurrence.neq.none,is_recurring_instance.eq.true')
      .lte('end_time', new Date().toISOString())
      .is('onvopay_payment_id', null)
      .in('status', ['confirmed', 'completed'])
      .order('end_time', { ascending: false })
      .limit(50); // Process max 50 per sweep

    if (fetchError) {
      throw new Error(`Error fetching appointments: ${fetchError.message}`);
    }

    console.log(`📋 Found ${appointments?.length || 0} appointments to process`);

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        summary: {
          found: 0,
          processed: 0,
          skipped: 0,
          failed: 0
        },
        message: 'No hay citas recurrentes pendientes de cobro'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Procesar cada cita
    const results = {
      processed: [] as string[],
      skipped: [] as { id: string; reason: string }[],
      failed: [] as { id: string; error: string }[]
    };

    for (const appointment of appointments) {
      try {
        console.log(`\n🔄 Processing appointment ${appointment.id}...`);

        // Primero actualizar status a 'completed' si no lo está
        if (appointment.status !== 'completed') {
          console.log(`📝 Updating appointment ${appointment.id} to completed`);
          await supabaseAdmin
            .from('appointments')
            .update({ 
              status: 'completed',
              last_modified_at: new Date().toISOString()
            })
            .eq('id', appointment.id);
        }

        // Buscar suscripción activa, priorizando recurring_rule_id
        let subscription = null;

        if (appointment.recurring_rule_id) {
          console.log(`🔍 Looking for subscription by recurring_rule_id: ${appointment.recurring_rule_id}`);
          const { data: subByRule } = await supabaseAdmin
            .from('onvopay_subscriptions')
            .select('*')
            .eq('recurring_rule_id', appointment.recurring_rule_id)
            .eq('status', 'active')
            .not('payment_method_id', 'is', null)
            .single();

          subscription = subByRule;
        }

        // Fallback: buscar por client_id + provider_id
        if (!subscription) {
          console.log(`🔍 Fallback: looking for subscription by client/provider`);
          const { data: subByClient } = await supabaseAdmin
            .from('onvopay_subscriptions')
            .select('*')
            .eq('client_id', appointment.client_id)
            .eq('provider_id', appointment.provider_id)
            .eq('status', 'active')
            .not('payment_method_id', 'is', null)
            .limit(1)
            .single();

          subscription = subByClient;
        }

        if (!subscription) {
          console.log(`⚠️ No active subscription found for appointment ${appointment.id}`);
          results.skipped.push({
            id: appointment.id,
            reason: 'No active subscription with payment method'
          });
          continue;
        }

        console.log(`✅ Found subscription ${subscription.id} for appointment ${appointment.id}`);

        // Invocar onvopay-process-membership-charge
        console.log(`📡 Invoking membership charge for appointment ${appointment.id}...`);
        
        const { data: chargeResponse, error: chargeError } = await supabaseAdmin.functions.invoke(
          'onvopay-process-membership-charge',
          {
            body: {
              subscription_id: subscription.id,
              appointment_id: appointment.id
            }
          }
        );

        if (chargeError || !chargeResponse?.success) {
          console.error(`❌ Charge failed for appointment ${appointment.id}:`, chargeError);
          results.failed.push({
            id: appointment.id,
            error: chargeError?.message || chargeResponse?.error || 'Unknown error'
          });
        } else if (chargeResponse?.skipped) {
          console.log(`⏭️ Charge skipped for appointment ${appointment.id}: ${chargeResponse.message}`);
          results.skipped.push({
            id: appointment.id,
            reason: chargeResponse.message
          });
        } else {
          console.log(`✅ Charge successful for appointment ${appointment.id}:`, chargeResponse.payment_id);
          results.processed.push(appointment.id);
        }

      } catch (error: any) {
        console.error(`❌ Error processing appointment ${appointment.id}:`, error.message);
        results.failed.push({
          id: appointment.id,
          error: error.message
        });
      }
    }

    const summary = {
      found: appointments.length,
      processed: results.processed.length,
      skipped: results.skipped.length,
      failed: results.failed.length
    };

    console.log('\n📊 Sweep summary:', summary);
    console.log('✅ Processed:', results.processed);
    console.log('⏭️ Skipped:', results.skipped);
    console.log('❌ Failed:', results.failed);

    return new Response(JSON.stringify({
      success: true,
      summary,
      details: results,
      message: `Procesadas ${summary.processed} de ${summary.found} citas encontradas`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ ERROR en sweep recurring:', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error desconocido',
      requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
