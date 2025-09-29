import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment configuration helper - unified across all OnvoPay functions
function getOnvoConfig() {
  const mode = Deno.env.get('ONVOPAY_MODE') || 'test';
  const isTest = mode === 'test';
  
  const baseUrl = isTest 
    ? (Deno.env.get('ONVOPAY_API_BASE_TEST') || 'https://sandbox.api.onvopay.com')
    : (Deno.env.get('ONVOPAY_API_BASE_LIVE') || 'https://api.onvopay.com');
  
  const secretKey = isTest
    ? Deno.env.get('ONVOPAY_TEST_SECRET_KEY')
    : Deno.env.get('ONVOPAY_LIVE_SECRET_KEY');
  
  const version = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  const debug = (Deno.env.get('ONVOPAY_DEBUG') || 'false') === 'true';
  
  return {
    mode,
    baseUrl,
    secretKey,
    version,
    debug,
    fullUrl: `${baseUrl}/${version}`,
    environment: isTest ? 'SANDBOX' : 'PRODUCTION'
  };
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log('🚀 ONVOPAY CAPTURE - Function started', {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get configuration
    const onvoConfig = getOnvoConfig();
    
    console.log('🧪 Env diagnostics:', {
      requestId,
      mode: onvoConfig.mode,
      environment: onvoConfig.environment,
      hasSecretKey: !!onvoConfig.secretKey,
      secretKeyPrefix: onvoConfig.secretKey?.substring(0, 8) + '...',
      baseUrl: onvoConfig.baseUrl,
      fullUrl: onvoConfig.fullUrl
    });
    
    if (!onvoConfig.secretKey) {
      console.error('❌ Missing ONVOPAY secret key for mode:', onvoConfig.mode);
      return new Response(JSON.stringify({
        error: 'CONFIGURATION_ERROR',
        message: `OnvoPay secret key not configured for ${onvoConfig.mode} mode`,
        hint: `Set ONVOPAY_${onvoConfig.mode.toUpperCase()}_SECRET_KEY`
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }

    const { paymentId, onvopay_payment_id } = await req.json();
    const lookupId = onvopay_payment_id || paymentId;

    console.log('🔐 Capture Request:', { requestId, paymentId, onvopay_payment_id, lookupId });

    // Get payment details - try by local ID first, then by onvopay_payment_id
    let query = supabaseAdmin
      .from('onvopay_payments')
      .select('*, appointments(provider_id, status)')
      .eq('status', 'authorized');
    
    // If onvopay_payment_id is provided, use it; otherwise use local id
    if (onvopay_payment_id) {
      query = query.eq('onvopay_payment_id', onvopay_payment_id);
    } else {
      query = query.eq('id', paymentId);
    }
    
    const { data: payment, error: paymentError } = await query.single();

    if (paymentError || !payment) {
      throw new Error('Pago no encontrado o no está autorizado');
    }

    // Verify user is the provider for this payment
    if (payment.appointments?.provider_id !== user.id) {
      throw new Error('No autorizado para capturar este pago');
    }

    // Verify appointment is completed
    if (payment.appointments?.status !== 'completed') {
      throw new Error('El servicio debe estar completado para capturar el pago');
    }

    if (!payment.onvopay_payment_id) {
      throw new Error('ID de pago de Onvopay no encontrado');
    }

    // Call OnvoPay capture API - FIXED: Use correct endpoint and secret key
    const captureUrl = `${onvoConfig.fullUrl}/payment-intents/${payment.onvopay_payment_id}/capture`;
    
    console.log('📡 Capturing payment in OnvoPay...', {
      requestId,
      url: captureUrl,
      paymentIntentId: payment.onvopay_payment_id,
      amount: payment.amount,
      environment: onvoConfig.environment
    });
    
    const onvopayResponse = await fetch(captureUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${onvoConfig.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: payment.amount // Capture full amount in cents
      })
    });

    const responseText = await onvopayResponse.text();
    const contentType = onvopayResponse.headers.get('content-type') || '';
    
    console.log('🔍 OnvoPay Capture Response:', {
      requestId,
      status: onvopayResponse.status,
      contentType,
      bodyLength: responseText.length
    });
    
    let onvopayResult: any;
    try {
      onvopayResult = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Invalid JSON from OnvoPay capture:', responseText.substring(0, 200));
      throw new Error('OnvoPay returned invalid JSON');
    }

    console.log('✅ OnvoPay Capture Result:', onvopayResult);

    if (!onvopayResponse.ok) {
      // Update payment with capture error
      await supabaseAdmin
        .from('onvopay_payments')
        .update({
          error_details: onvopayResult,
          retry_count: (payment.retry_count || 0) + 1
        })
        .eq('id', payment.id);

      throw new Error(onvopayResult.message || 'Error al capturar el pago');
    }

    // Update payment as captured
    const { error: updateError } = await supabaseAdmin
      .from('onvopay_payments')
      .update({
        status: 'captured',
        captured_at: new Date().toISOString(),
        onvopay_response: { ...payment.onvopay_response, capture: onvopayResult }
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      throw new Error('Error al actualizar estado del pago');
    }

    // Update appointment final price
    await supabaseAdmin
      .from('appointments')
      .update({
        final_price: payment.amount / 100, // Convert cents to dollars
        price_finalized: true
      })
      .eq('id', payment.appointment_id);

    const duration = Date.now() - startTime;
    console.log(`✅ Capture completed successfully in ${duration}ms`, {
      requestId,
      paymentId: payment.id,
      onvopayPaymentId: payment.onvopay_payment_id,
      amountCaptured: payment.amount,
      environment: onvoConfig.environment
    });

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment.id,
      onvopay_payment_id: payment.onvopay_payment_id,
      amount_captured: payment.amount,
      onvopay_capture_id: onvopayResult.id,
      environment: onvoConfig.environment,
      message: 'Pago capturado exitosamente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in onvopay-capture:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});