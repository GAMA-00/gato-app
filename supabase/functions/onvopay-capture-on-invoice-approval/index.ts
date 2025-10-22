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
    const { invoiceId, totalAmount } = await req.json();
    
    if (!invoiceId) {
      throw new Error('invoiceId is required');
    }

    console.log('💰 CAPTURA POSTPAGO - Cliente acepta desglose:', { invoiceId, totalAmount });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar invoice y su appointment asociado
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('appointment_id, total_price')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Buscar pago pendiente para este appointment
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('onvopay_payments')
      .select('id, status, onvopay_payment_id, amount, payment_type')
      .eq('appointment_id', invoice.appointment_id)
      .eq('status', 'pending_authorization')
      .single();

    if (paymentError || !payment) {
      console.log('⚠️ No hay payment intent pendiente para este appointment');
      return new Response(JSON.stringify({
        success: false,
        error: 'No payment intent found or already processed'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`💳 Capturando pago postpago ${payment.id} (${invoice.total_price / 100} USD)`);

    // Llamar a OnvoPay API para capturar
    const captureUrl = `${Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com'}/v1/payment-intents/${payment.onvopay_payment_id}/capture`;
    const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');

    if (!ONVOPAY_SECRET_KEY) {
      throw new Error('ONVOPAY_SECRET_KEY not configured');
    }

    console.log('📡 Llamando a OnvoPay API para capturar pago postpago...');

    const onvopayResponse = await fetch(captureUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: invoice.total_price // Capturar el monto total del invoice
      })
    });

    const responseText = await onvopayResponse.text();
    let onvopayResult: any;
    
    try {
      onvopayResult = JSON.parse(responseText);
    } catch (e) {
      console.error(`❌ Error parseando respuesta de OnvoPay:`, responseText.substring(0, 200));
      throw new Error('Invalid JSON response from OnvoPay');
    }

    if (!onvopayResponse.ok) {
      console.error(`❌ Error en captura de OnvoPay:`, onvopayResult);
      
      // Actualizar payment con error
      await supabaseAdmin
        .from('onvopay_payments')
        .update({
          status: 'failed',
          error_details: onvopayResult,
          retry_count: ((payment as any).retry_count || 0) + 1
        })
        .eq('id', payment.id);

      throw new Error(onvopayResult.message || 'OnvoPay capture failed');
    }

    // Actualizar payment como captured
    const { error: updateError } = await supabaseAdmin
      .from('onvopay_payments')
      .update({
        status: 'captured',
        captured_at: new Date().toISOString(),
        amount: invoice.total_price, // Actualizar con el monto final
        onvopay_response: { 
          ...(payment as any).onvopay_response, 
          capture: onvopayResult 
        }
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error(`⚠️ Error actualizando payment ${payment.id}:`, updateError);
      throw new Error(updateError.message);
    }

    console.log(`✅ Pago postpago capturado exitosamente para invoice ${invoiceId}`);

    return new Response(JSON.stringify({
      success: true,
      paymentId: payment.id,
      amountCaptured: invoice.total_price,
      onvopayCaptureId: onvopayResult.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error crítico en capture-on-invoice-approval:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
