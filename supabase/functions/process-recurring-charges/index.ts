import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 INICIANDO PROCESO DE COBROS RECURRENTES:', new Date().toISOString());

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Obtener suscripciones activas que deben cobrarse hoy o antes
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Buscando cobros pendientes hasta:', today);

    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('onvopay_subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_charge_date', today);

    if (fetchError) {
      console.error('❌ Error obteniendo suscripciones:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('✅ No hay cobros pendientes para hoy');
      return new Response(JSON.stringify({ 
        success: true,
        processed: 0, 
        message: 'No hay cobros pendientes'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 ${subscriptions.length} suscripciones para procesar`);

    let processed = 0;
    let failed = 0;
    const results = [];

    for (const sub of subscriptions) {
      console.log(`\n💳 Procesando suscripción ${sub.id} (cliente: ${sub.client_id})`);
      
      try {
        // NUEVA LÓGICA: Usar edge function dedicada onvopay-process-membership-charge
        console.log('📡 Delegando a onvopay-process-membership-charge...');
        
        const { data: chargeResponse, error: chargeError } = await supabaseAdmin.functions.invoke(
          'onvopay-process-membership-charge',
          {
            body: {
              subscription_id: sub.id,
              appointment_id: sub.external_reference
            }
          }
        );

        if (chargeError || !chargeResponse?.success) {
          console.error('❌ Error procesando cobro:', chargeError || chargeResponse?.error);
          throw new Error(chargeError?.message || chargeResponse?.error || 'Error desconocido');
        }

        console.log('✅ Cobro procesado exitosamente:', chargeResponse);

        processed++;
        results.push({
          subscription_id: sub.id,
          status: 'success',
          payment_id: chargeResponse.payment_id,
          next_charge_date: chargeResponse.next_charge_date
        });

        console.log(`✅ Cobro procesado exitosamente para suscripción ${sub.id}`);

      } catch (error: any) {
        failed++;
        console.error(`❌ Error procesando suscripción ${sub.id}:`, error.message);

        // Incrementar contador de fallos
        const newFailedAttempts = (sub.failed_attempts || 0) + 1;
        const shouldCancel = newFailedAttempts >= (sub.max_retry_attempts || 3);

        await supabaseAdmin
          .from('onvopay_subscriptions')
          .update({
            failed_attempts: newFailedAttempts,
            last_failure_reason: error.message,
            status: shouldCancel ? 'cancelled' : 'active',
            cancelled_at: shouldCancel ? new Date().toISOString() : null
          })
          .eq('id', sub.id);

        if (shouldCancel) {
          console.log(`🚫 Suscripción ${sub.id} cancelada tras ${newFailedAttempts} intentos fallidos`);
        }

        results.push({
          subscription_id: sub.id,
          status: 'failed',
          error: error.message,
          cancelled: shouldCancel
        });
      }
    }

    console.log('\n✅ PROCESO COMPLETADO:', {
      total: subscriptions.length,
      exitosos: processed,
      fallidos: failed,
      timestamp: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      total: subscriptions.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ ERROR CRÍTICO en process-recurring-charges:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error desconocido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
