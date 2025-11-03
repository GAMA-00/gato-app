import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Subscription {
  id: string;
  client_id: string;
  provider_id: string;
  amount: number;
  interval_type: string;
  next_charge_date: string;
  last_charge_date: string | null;
  initial_charge_date: string | null;
  payment_method_id: string | null;
  failed_attempts: number;
  max_retry_attempts: number;
  external_reference: string | null;
  original_appointment_template: any;
  status: string;
  loop_status: string;
}

/**
 * Calculate next charge date based on interval type
 */
function calculateNextChargeDate(currentDate: string, intervalType: string): string {
  const current = new Date(currentDate);
  const next = new Date(current);
  
  switch (intervalType) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'triweekly':
      next.setDate(next.getDate() + 21);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      // Handle end of month edge cases
      if (next.getDate() !== current.getDate()) {
        next.setDate(0); // Set to last day of previous month
      }
      break;
    default:
      throw new Error(`Unknown interval type: ${intervalType}`);
  }
  
  return next.toISOString().split('T')[0];
}

/**
 * Get cycle number from initial charge date and interval
 */
function calculateCycleNumber(initialChargeDate: string, intervalType: string): number {
  const initial = new Date(initialChargeDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - initial.getTime()) / (1000 * 60 * 60 * 24));
  
  switch (intervalType) {
    case 'weekly':
      return Math.floor(diffDays / 7) + 1;
    case 'biweekly':
      return Math.floor(diffDays / 14) + 1;
    case 'triweekly':
      return Math.floor(diffDays / 21) + 1;
    case 'monthly':
      const monthsDiff = (now.getFullYear() - initial.getFullYear()) * 12 + 
                        (now.getMonth() - initial.getMonth());
      return monthsDiff + 1;
    default:
      return 1;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ⚠️ DEPRECATED: Este edge function ya no es necesario
  // OnvoPay Loops gestiona los cobros automáticos ahora
  console.warn('⚠️ DEPRECATED: onvopay-process-recurring-charges');
  console.warn('OnvoPay Loops gestiona los cobros recurrentes automáticamente.');
  console.warn('Este función permanece solo para compatibilidad temporal.');
  
  return new Response(JSON.stringify({
    deprecated: true,
    message: 'Este edge function está deprecado. Usa OnvoPay Loops via onvopay-create-loop.',
    recommendation: 'Los cobros automáticos ahora son gestionados por OnvoPay Loops API.',
    migration_date: '2025-11-03'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });

  // Código original comentado para referencia
  /*
  try {
    console.log('🔄 INICIANDO PROCESO DE COBROS RECURRENTES:', new Date().toISOString());

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');
    const ONVOPAY_API_URL = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com';

    if (!ONVOPAY_SECRET_KEY) {
      throw new Error('ONVOPAY_SECRET_KEY not configured');
    }

    // 1. Get active subscriptions that need charging today or earlier
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Buscando cobros pendientes hasta:', today);

    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('onvopay_subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_charge_date', today)
      .not('payment_method_id', 'is', null);

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

    for (const sub of subscriptions as Subscription[]) {
      console.log(`\n💳 Procesando suscripción ${sub.id} (cliente: ${sub.client_id})`);
      
      try {
        // Calculate cycle number
        const cycleN = calculateCycleNumber(
          sub.initial_charge_date || sub.next_charge_date, 
          sub.interval_type
        );
        console.log(`🔢 Ciclo número: ${cycleN}`);

        // Get customer's OnvoPay customer ID
        const { data: customer, error: customerError } = await supabaseAdmin
          .from('onvopay_customers')
          .select('onvopay_customer_id')
          .eq('client_id', sub.client_id)
          .single();

        if (customerError || !customer) {
          throw new Error('Cliente no tiene customer_id de OnvoPay');
        }

        // STEP 1: Create "Iniciado" Payment Intent in OnvoPay
        const idempotencyKey = `${sub.id}-cycle-${cycleN}`;
        console.log('📝 Creando Payment Intent con idempotency:', idempotencyKey);

        const paymentIntentPayload = {
          amount: Math.round(sub.amount * 100), // Convert to cents
          currency: 'USD',
          capture: false, // Create as "Iniciado", capture next
          customer_id: customer.onvopay_customer_id,
          payment_method_id: sub.payment_method_id,
          description: `Cobro Automático - Ciclo ${cycleN} - ${sub.interval_type}`,
          metadata: {
            subscription_id: sub.id,
            cycle_n: cycleN,
            frequency: sub.interval_type,
            auto_charge: true,
            tz: 'America/Costa_Rica',
            created_by: 'gato-app-scheduler'
          }
        };

        const createResponse = await fetch(`${ONVOPAY_API_URL}/v1/payment-intents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify(paymentIntentPayload)
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.text();
          throw new Error(`OnvoPay create failed: ${createResponse.status} - ${errorData}`);
        }

        const paymentIntent = await createResponse.json();
        console.log('✅ Payment Intent creado:', paymentIntent.id);

        // STEP 2: Immediately capture the payment (automatic recurring charge)
        const captureIdempotencyKey = `${sub.id}-capture-${cycleN}`;
        console.log('🎯 Capturando pago automáticamente:', captureIdempotencyKey);

        // FIX CRÍTICO: OnvoPay capture NO acepta parámetro 'amount'
        const captureResponse = await fetch(
          `${ONVOPAY_API_URL}/v1/payment-intents/${paymentIntent.id}/capture`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': captureIdempotencyKey
            }
            // IMPORTANT: No body with 'amount' - OnvoPay rejects it
          }
        );

        if (!captureResponse.ok) {
          const errorData = await captureResponse.text();
          throw new Error(`OnvoPay capture failed: ${captureResponse.status} - ${errorData}`);
        }

        const captureData = await captureResponse.json();
        console.log('✅ Captura exitosa:', captureData.id);

        // STEP 3: Save payment record
        const { error: paymentError } = await supabaseAdmin
          .from('onvopay_payments')
          .insert({
            appointment_id: sub.external_reference, // May be null for future cycles
            client_id: sub.client_id,
            provider_id: sub.provider_id,
            amount: sub.amount * 100,
            subtotal: sub.amount * 100,
            iva_amount: 0,
            currency: 'USD',
            status: 'captured',
            payment_type: 'recurring_charge',
            onvopay_payment_id: paymentIntent.id,
            onvopay_transaction_id: captureData.transaction_id || captureData.id,
            captured_at: new Date().toISOString(),
            billing_info: {},
            cycle_metadata: {
              cycle_n: cycleN,
              auto_charge: true,
              subscription_id: sub.id
            }
          });

        if (paymentError) {
          console.error('⚠️ Error guardando payment:', paymentError);
        }

        // STEP 4: Update subscription with next charge date
        const nextChargeDate = calculateNextChargeDate(today, sub.interval_type);
        console.log('📅 Próximo cobro programado para:', nextChargeDate);

        const { error: updateError } = await supabaseAdmin
          .from('onvopay_subscriptions')
          .update({
            last_charge_date: today,
            next_charge_date: nextChargeDate,
            failed_attempts: 0 // Reset on success
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error('⚠️ Error actualizando subscription:', updateError);
        }

        // STEP 5: Optionally create next appointment (if template exists)
        if (sub.original_appointment_template && sub.original_appointment_template.listing_id) {
          console.log('📝 Creando próxima cita desde template...');
          
          const template = sub.original_appointment_template;
          const nextStartTime = new Date(nextChargeDate + 'T' + (template.start_time || '09:00:00'));
          const duration = template.duration || 60;
          const nextEndTime = new Date(nextStartTime.getTime() + duration * 60000);

          const { error: appointmentError } = await supabaseAdmin
            .from('appointments')
            .insert({
              listing_id: template.listing_id,
              client_id: sub.client_id,
              provider_id: sub.provider_id,
              start_time: nextStartTime.toISOString(),
              end_time: nextEndTime.toISOString(),
              status: 'confirmed', // Auto-confirmed for recurring
              recurrence: sub.interval_type,
              is_recurring_instance: true,
              notes: template.notes || `Servicio Recurrente - Ciclo ${cycleN + 1}`,
              client_name: template.client_name,
              client_email: template.client_email,
              client_phone: template.client_phone,
              client_address: template.client_address
            });

          if (appointmentError) {
            console.error('⚠️ Error creando appointment:', appointmentError);
          } else {
            console.log('✅ Próxima cita creada para:', nextStartTime.toISOString());
          }
        }

        processed++;
        results.push({
          subscription_id: sub.id,
          status: 'success',
          payment_id: paymentIntent.id,
          cycle_n: cycleN,
          next_charge_date: nextChargeDate
        });

        console.log(`✅ Cobro procesado exitosamente para suscripción ${sub.id}`);

      } catch (error: any) {
        failed++;
        console.error(`❌ Error procesando suscripción ${sub.id}:`, error.message);

        // Increment failure counter
        const newFailedAttempts = (sub.failed_attempts || 0) + 1;
        const shouldPause = newFailedAttempts >= (sub.max_retry_attempts || 3);

        await supabaseAdmin
          .from('onvopay_subscriptions')
          .update({
            failed_attempts: newFailedAttempts,
            last_failure_reason: error.message,
            status: shouldPause ? 'needs_attention' : 'active',
            loop_status: shouldPause ? 'paused' : 'manual_scheduling'
          })
          .eq('id', sub.id);

        if (shouldPause) {
          console.log(`🚫 Suscripción ${sub.id} pausada tras ${newFailedAttempts} intentos fallidos`);
        } else {
          console.log(`🔄 Reintento ${newFailedAttempts}/${sub.max_retry_attempts} programado`);
        }

        results.push({
          subscription_id: sub.id,
          status: 'failed',
          error: error.message,
          failed_attempts: newFailedAttempts,
          paused: shouldPause
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
  */
});
