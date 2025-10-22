import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const captureResults = [];

    for (const appointmentId of appointmentIds) {
      console.log(`\n🔍 Procesando cita ${appointmentId}...`);
      
      // Buscar pago autorizado o pendiente para esta cita
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('onvopay_payments')
        .select('id, status, onvopay_payment_id, amount, payment_type')
        .eq('appointment_id', appointmentId)
        .in('status', ['pending_authorization', 'authorized'])
        .single();

      if (paymentError || !payment) {
        console.log(`⚠️ No hay pago autorizado para appointment ${appointmentId}`, {
          possibleReasons: [
            'Ya fue capturado anteriormente',
            'Es un pago postpago (no requiere prepago)',
            'El pago falló y fue marcado como failed',
            'Aún no se ha creado el pago'
          ]
        });
        captureResults.push({
          appointmentId,
          status: 'no_payment_found',
          message: 'No authorized payment found (may be post-payment or already captured)'
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
        
        const confirmUrl = `${Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com'}/v1/payment-intents/${payment.onvopay_payment_id}/confirm`;
        const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');

        if (!ONVOPAY_SECRET_KEY) {
          throw new Error('ONVOPAY_SECRET_KEY not configured');
        }

        const confirmResponse = await fetch(confirmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
          }
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

      const onvopayResponse = await fetch(captureUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: payment.amount
        })
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
    }

    console.log('\n✅ PROCESO DE CAPTURA COMPLETADO:', {
      totalAppointments: appointmentIds.length,
      results: captureResults
    });

    return new Response(JSON.stringify({
      success: true,
      results: captureResults
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
