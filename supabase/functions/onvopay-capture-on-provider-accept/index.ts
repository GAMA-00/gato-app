import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calculate next charge date based on recurrence type
 * Uses same logic as recurring appointments
 */
function calculateNextChargeDate(startTime: string, recurrence: string): string {
  const start = new Date(startTime);
  const next = new Date(start);
  
  switch (recurrence) {
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
      if (next.getDate() !== start.getDate()) {
        next.setDate(0); // Set to last day of previous month
      }
      break;
    default:
      throw new Error(`Unknown recurrence type: ${recurrence}`);
  }
  
  return next.toISOString().split('T')[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentIds } = await req.json();
    
    if (!appointmentIds || !Array.isArray(appointmentIds)) {
      throw new Error('appointmentIds array is required');
    }

    console.log('💰 CAPTURA EN ACEPTACIÓN DE PROVEEDOR - Iniciando para citas:', appointmentIds);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch appointments (including recurring ones - they now follow same flow)
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('id, recurrence, recurring_rule_id')
      .in('id', appointmentIds);

    if (appointmentsError) {
      console.error('❌ Error fetching appointments:', appointmentsError);
      throw new Error('Error fetching appointments: ' + appointmentsError.message);
    }

    console.log(`📋 Processing ${appointmentIds.length} appointments (including recurring)`);
    
    const recurringAppointments = appointments?.filter(apt => 
      apt.recurrence && apt.recurrence !== 'none' && apt.recurrence !== ''
    ) || [];
    
    if (recurringAppointments.length > 0) {
      console.log(`🔄 ${recurringAppointments.length} recurring appointment(s) - will capture initial charge`);
    }

    const captureResults = [];
    const recurringSetup = [];

    for (const appointmentId of appointmentIds) {
      const appointment = appointments?.find(a => a.id === appointmentId);
      console.log(`\n🔍 Procesando cita ${appointmentId}...`);
      
      // Buscar pago autorizado, pendiente, o ya capturado para esta cita
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('onvopay_payments')
        .select('id, status, onvopay_payment_id, amount, payment_type, client_id')
        .eq('appointment_id', appointmentId)
        .in('status', ['pending_authorization', 'authorized', 'captured'])
        .single();

      if (paymentError || !payment) {
        console.log(`⚠️ No hay pago para appointment ${appointmentId}`, {
          possibleReasons: [
            'Es un pago postpago (no requiere prepago)',
            'El pago falló y fue marcado como failed',
            'Aún no se ha creado el pago'
          ]
        });
        captureResults.push({
          appointmentId,
          status: 'no_payment_found',
          message: 'No payment found (may be post-payment)'
        });
        continue;
      }

      // ✅ NUEVO: Saltear si el pago ya está captured (pagos recurrentes)
      if (payment.status === 'captured') {
        console.log(`✅ Payment already captured for appointment ${appointmentId} (recurring payment captured on booking)`);
        captureResults.push({
          appointmentId,
          paymentId: payment.id,
          status: 'already_captured',
          message: 'Pago recurrente ya fue capturado al crear la cita'
        });
        continue;
      }

      console.log(`🔍 Estado de pago encontrado:`, {
        appointmentId,
        paymentId: payment.id,
        status: payment.status,
        onvopayPaymentId: payment.onvopay_payment_id,
        amount: payment.amount / 100
      });

      // Si el pago está en pending_authorization, primero debemos confirmarlo
      if (payment.status === 'pending_authorization') {
        console.log(`🔄 Pago en pending_authorization, ejecutando confirm primero...`);
        
        // Obtener payment_method_id desde payment_methods (no desde onvopay_payments)
        console.log('🔍 Getting payment method from payment_methods table...');
        const { data: savedMethods } = await supabaseAdmin
          .from('payment_methods')
          .select('onvopay_payment_method_id')
          .eq('user_id', payment.client_id)
          .not('onvopay_payment_method_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        const paymentMethodId = savedMethods?.[0]?.onvopay_payment_method_id;

        if (!paymentMethodId) {
          console.error('❌ No payment method disponible para cliente', payment.client_id);
          captureResults.push({
            appointmentId,
            paymentId: payment.id,
            status: 'confirm_failed',
            error: 'No payment method available'
          });
          continue;
        }

        console.log('✅ Payment method found:', paymentMethodId);
        
        const confirmUrl = `${Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com'}/v1/payment-intents/${payment.onvopay_payment_id}/confirm`;
        const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');

        if (!ONVOPAY_SECRET_KEY) {
          throw new Error('ONVOPAY_SECRET_KEY not configured');
        }

        console.log('📡 Confirmando payment intent con OnvoPay:', {
          paymentIntentId: payment.onvopay_payment_id,
          paymentMethodId: paymentMethodId,
          url: confirmUrl
        });

        const confirmResponse = await fetch(confirmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentMethodId: paymentMethodId  // ✅ camelCase como lo espera OnvoPay
          })
        });

        const confirmText = await confirmResponse.text();
        let confirmResult: any;
        
        try {
          confirmResult = JSON.parse(confirmText);
        } catch (e) {
          console.error(`❌ Error parseando respuesta de confirm:`, confirmText.substring(0, 200));
          captureResults.push({
            appointmentId,
            paymentId: payment.id,
            status: 'confirm_failed',
            error: 'Invalid JSON response from OnvoPay confirm'
          });
          continue;
        }

        if (!confirmResponse.ok) {
          console.error(`❌ Error en confirm de OnvoPay para pago ${payment.id}:`, confirmResult);
          
          await supabaseAdmin
            .from('onvopay_payments')
            .update({
              error_details: confirmResult,
              retry_count: ((payment as any).retry_count || 0) + 1
            })
            .eq('id', payment.id);

          captureResults.push({
            appointmentId,
            paymentId: payment.id,
            status: 'confirm_failed',
            error: confirmResult.message || 'OnvoPay confirm failed'
          });
          continue;
        }

        console.log(`✅ Pago confirmado exitosamente, actualizando a authorized...`);
        
        // Actualizar el pago a authorized
        await supabaseAdmin
          .from('onvopay_payments')
          .update({
            status: 'authorized',
            onvopay_response: { 
              ...(payment as any).onvopay_response, 
              confirm: confirmResult 
            }
          })
          .eq('id', payment.id);
      }

      console.log(`💳 Capturando pago ${payment.id} (${payment.amount / 100} USD) para appointment ${appointmentId}`);

      // Llamar a onvopay-capture usando la misma lógica que el flujo manual
      const captureUrl = `${Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com'}/v1/payment-intents/${payment.onvopay_payment_id}/capture`;
      const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');

      if (!ONVOPAY_SECRET_KEY) {
        throw new Error('ONVOPAY_SECRET_KEY not configured');
      }

      console.log('📡 Llamando a OnvoPay API para capturar...', {
        paymentIntentId: payment.onvopay_payment_id,
        amount: payment.amount
      });

      // FIX CRÍTICO: OnvoPay capture endpoint NO acepta parámetro 'amount'
      // El monto ya está definido en el Payment Intent original
      const onvopayResponse = await fetch(captureUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
        // Sin body - OnvoPay rechaza si enviamos { amount }
      });

      const responseText = await onvopayResponse.text();
      let onvopayResult: any;
      
      try {
        onvopayResult = JSON.parse(responseText);
      } catch (e) {
        console.error(`❌ Error parseando respuesta de OnvoPay:`, responseText.substring(0, 200));
        captureResults.push({
          appointmentId,
          paymentId: payment.id,
          status: 'capture_failed',
          error: 'Invalid JSON response from OnvoPay'
        });
        continue;
      }

      if (!onvopayResponse.ok) {
        console.error(`❌ Error en captura de OnvoPay para pago ${payment.id}:`, onvopayResult);
        
        // Actualizar payment con error
        await supabaseAdmin
          .from('onvopay_payments')
          .update({
            error_details: onvopayResult,
            retry_count: ((payment as any).retry_count || 0) + 1
          })
          .eq('id', payment.id);

        captureResults.push({
          appointmentId,
          paymentId: payment.id,
          status: 'capture_failed',
          error: onvopayResult.message || 'OnvoPay capture failed'
        });
        continue;
      }

      // Actualizar payment como captured
      const { error: updateError } = await supabaseAdmin
        .from('onvopay_payments')
        .update({
          status: 'captured',
          captured_at: new Date().toISOString(),
          onvopay_response: { 
            ...(payment as any).onvopay_response, 
            capture: onvopayResult 
          }
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error(`⚠️ Error actualizando payment ${payment.id} en BD:`, updateError);
        captureResults.push({
          appointmentId,
          paymentId: payment.id,
          status: 'db_update_failed',
          error: updateError.message
        });
        continue;
      }

      console.log(`✅ Pago ${payment.id} capturado exitosamente para appointment ${appointmentId}`);
      captureResults.push({
        appointmentId,
        paymentId: payment.id,
        status: 'captured',
        amountCaptured: payment.amount,
        onvopayCaptureId: onvopayResult.id
      });

      // NOTE: Loop creation removed from here - now handled in checkout flow
      // Recurring appointments already have Loop created and first charge captured
      if (appointment.recurrence && 
          appointment.recurrence !== 'none' && 
          appointment.recurrence !== 'once') {
        
        console.log('ℹ️ Recurring appointment - Loop already active from checkout');
        
        recurringActivations.push({
          appointment_id: appointmentId,
          status: 'loop_already_active',
          payment_captured: true,
          note: 'OnvoPay Loop was created during booking checkout'
        });
      }
    }

    console.log('\n✅ PROCESO DE CAPTURA COMPLETADO:', {
      totalAppointments: appointmentIds.length,
      captured: captureResults.filter(r => r.status === 'captured').length,
      recurringSetup: recurringSetup.length,
      results: captureResults
    });

    return new Response(JSON.stringify({
      success: true,
      results: captureResults,
      recurring_setup: recurringSetup,
      message: recurringSetup.length > 0 
        ? `${recurringSetup.length} recurring subscription(s) activated for future charges`
        : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error crítico en capture-on-provider-accept:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
