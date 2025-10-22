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
        // Verificar que tenga payment_method_id
        if (!sub.payment_method_id) {
          throw new Error('No hay payment_method_id guardado para esta suscripción');
        }

        // 2. Crear Payment Intent usando onvopay-authorize
        console.log('📡 Creando Payment Intent...');
        const { data: authResponse, error: authError } = await supabaseAdmin.functions.invoke(
          'onvopay-authorize',
          {
            body: {
              appointmentId: sub.external_reference,
              amount: sub.amount, // Amount ya está en dólares (NUMERIC), no multiplicar por 100
              billing_info: sub.original_appointment_template?.billing_info || {
                name: sub.original_appointment_template?.client_name || 'Cliente',
                email: sub.original_appointment_template?.client_email || '',
                phone: sub.original_appointment_template?.client_phone || '',
                address: sub.original_appointment_template?.client_address || ''
              }
            }
          }
        );

        if (authError) {
          console.error('❌ Error en onvopay-authorize:', authError);
          throw new Error(`Error autorizando pago: ${authError.message}`);
        }

        console.log('✅ Payment Intent creado:', authResponse);

        // 3. Confirmar el pago automáticamente usando el payment_method_id guardado
        console.log('🔐 Confirmando pago con método guardado...');
        const { data: confirmResponse, error: confirmError } = await supabaseAdmin.functions.invoke(
          'onvopay-confirm',
          {
            body: {
              paymentIntentId: authResponse.payment_intent_id,
              payment_method_id: sub.payment_method_id,
              billing_info: sub.original_appointment_template?.billing_info,
              card_data: {} // No necesario, usamos payment_method_id
            }
          }
        );

        if (confirmError) {
          console.error('❌ Error en onvopay-confirm:', confirmError);
          throw new Error(`Error confirmando pago: ${confirmError.message}`);
        }

        console.log('✅ Pago confirmado exitosamente');

        // 4. Calcular próxima fecha de cobro
        const nextDate = new Date(sub.next_charge_date);
        if (sub.interval_type === 'week') {
          nextDate.setDate(nextDate.getDate() + (7 * sub.interval_count));
        } else if (sub.interval_type === 'month') {
          nextDate.setMonth(nextDate.getMonth() + sub.interval_count);
        }

        // 5. Actualizar suscripción con nueva fecha y resetear contador de fallos
        const { error: updateError } = await supabaseAdmin
          .from('onvopay_subscriptions')
          .update({
            next_charge_date: nextDate.toISOString().split('T')[0],
            last_charge_date: today,
            failed_attempts: 0,
            last_failure_reason: null
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error('⚠️ Error actualizando suscripción:', updateError);
        }

        processed++;
        results.push({
          subscription_id: sub.id,
          status: 'success',
          next_charge_date: nextDate.toISOString().split('T')[0]
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
