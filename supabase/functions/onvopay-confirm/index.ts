import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OnvoPay API configuration
const getOnvoConfig = () => {
  const ONVOPAY_API_BASE = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com';
  const ONVOPAY_API_VERSION = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  
  return {
    baseUrl: ONVOPAY_API_BASE,
    version: ONVOPAY_API_VERSION,
    fullUrl: `${ONVOPAY_API_BASE}/${ONVOPAY_API_VERSION}`
  };
};

serve(async (req) => {
  console.log('🚀 ONVOPAY CONFIRM - Function started');
  console.log('🔎 Request info:', { method: req.method, url: req.url });

  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight handled');
      return new Response(null, { headers: corsHeaders });
    }

    const onvoConfig = getOnvoConfig();
    const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');

    if (!ONVOPAY_SECRET_KEY) {
      console.error('❌ Missing ONVOPAY_SECRET_KEY environment variable');
      return new Response(JSON.stringify({
        error: 'CONFIGURATION_ERROR',
        message: 'Configuración de OnvoPay incompleta'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error('❌ Invalid JSON body:', e);
      return new Response(JSON.stringify({
        error: 'INVALID_JSON',
        message: 'El cuerpo del request no es JSON válido'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('📋 Confirm request data:', {
      hasPaymentIntentId: !!body.payment_intent_id,
      hasCardData: !!body.card_data,
      hasBillingInfo: !!body.billing_info
    });

    // Input validation
    const missing: string[] = [];
    if (!body.payment_intent_id) missing.push('payment_intent_id');
    if (!body.card_data) missing.push('card_data');
    else {
      if (!body.card_data.number) missing.push('card_data.number');
      if (!body.card_data.expiry) missing.push('card_data.expiry');
      if (!body.card_data.cvv) missing.push('card_data.cvv');
      if (!body.card_data.name) missing.push('card_data.name');
    }
    if (!body.billing_info) missing.push('billing_info');

    if (missing.length > 0) {
      console.error('❌ Validation failed. Missing fields:', missing);
      return new Response(JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'Campos requeridos faltantes',
        missing
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get payment record from database
    const { data: payment, error: paymentError } = await supabase
      .from('onvopay_payments')
      .select('*')
      .eq('onvopay_payment_id', body.payment_intent_id)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Payment not found:', paymentError);
      return new Response(JSON.stringify({
        error: 'PAYMENT_NOT_FOUND',
        message: 'No se encontró el Payment Intent especificado'
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Prepare OnvoPay confirm request
    const confirmData = {
      payment_method: {
        type: 'card',
        card: {
          number: body.card_data.number,
          exp_month: body.card_data.expiry.split('/')[0],
          exp_year: body.card_data.expiry.split('/')[1],
          cvc: body.card_data.cvv
        }
      },
      customer: {
        name: body.card_data.name,
        phone: body.billing_info.phone,
        address: body.billing_info.address
      }
    };

    console.log('📡 Confirming Payment Intent with OnvoPay...');
    const confirmUrl = `${onvoConfig.fullUrl}/payment-intents/${body.payment_intent_id}/confirm`;
    
    const onvoResponse = await fetch(confirmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(confirmData)
    });

    const responseText = await onvoResponse.text();
    const contentType = onvoResponse.headers.get('content-type') ?? '';
    
    console.log('🔍 OnvoPay confirm response:', {
      status: onvoResponse.status,
      contentType: contentType,
      bodyLength: responseText.length
    });

    if (!contentType.includes('application/json')) {
      console.error('❌ Non-JSON response from OnvoPay confirm');
      return new Response(JSON.stringify({
        error: 'NON_JSON_RESPONSE',
        message: 'OnvoPay returned a non-JSON response',
        status: onvoResponse.status
      }), { 
        status: onvoResponse.status >= 400 ? onvoResponse.status : 502, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let onvoResult;
    try {
      onvoResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse OnvoPay confirm response:', parseError);
      return new Response(JSON.stringify({
        error: 'INVALID_JSON',
        message: 'OnvoPay returned malformed JSON'
      }), { 
        status: 502, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!onvoResponse.ok || onvoResult.error) {
      console.error('❌ OnvoPay confirm error:', onvoResult);
      return new Response(JSON.stringify({
        error: 'ONVOPAY_CONFIRM_ERROR',
        message: onvoResult.error?.message || 'Error confirmando el pago',
        status: onvoResponse.status,
        onvoPayError: onvoResult.error
      }), { 
        status: onvoResponse.status || 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Determine final status
    const finalStatus = onvoResult.status === 'succeeded' ? 'captured' : 'authorized';
    const now = new Date().toISOString();

    // Update payment record
    const { error: updateError } = await supabase
      .from('onvopay_payments')
      .update({
        status: finalStatus,
        authorized_at: finalStatus === 'authorized' || finalStatus === 'captured' ? now : null,
        captured_at: finalStatus === 'captured' ? now : null,
        onvopay_transaction_id: onvoResult.charges?.data?.[0]?.id || onvoResult.id,
        onvopay_response: onvoResult
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('❌ Failed to update payment record:', updateError);
      // Don't throw error here, OnvoPay was successful
    }

    console.log('✅ Payment confirmed successfully:', {
      paymentId: payment.id,
      finalStatus,
      onvoStatus: onvoResult.status
    });

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment.id,
      status: finalStatus,
      onvopay_status: onvoResult.status,
      message: finalStatus === 'captured' 
        ? 'Pago procesado exitosamente'
        : 'Pago autorizado exitosamente',
      timestamp: now
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Confirm function error:', error);
    return new Response(JSON.stringify({
      error: 'FUNCTION_ERROR',
      message: error.message || 'Error confirmando el pago',
      success: false,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});