import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OnvoPay API configuration - Environment based
const getOnvoConfig = () => {
  const ONVOPAY_API_BASE = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.dev.onvopay.com'; // Default to sandbox
  const ONVOPAY_API_VERSION = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  const ONVOPAY_API_PATH = Deno.env.get('ONVOPAY_API_PATH') || 'payment-intents'; // Fixed: hyphens not underscores
  const ONVOPAY_DEBUG = Deno.env.get('ONVOPAY_DEBUG') === 'true';
  
  return {
    baseUrl: ONVOPAY_API_BASE,
    version: ONVOPAY_API_VERSION,
    path: ONVOPAY_API_PATH,
    debug: ONVOPAY_DEBUG,
    fullUrl: `${ONVOPAY_API_BASE}/${ONVOPAY_API_VERSION}/${ONVOPAY_API_PATH}`
  };
};

serve(async (req) => {
  // Diagnostics
  let currentPhase = 'start';
  console.log('🚀 ONVOPAY AUTHORIZE - Function started');
  console.log('🔎 Request info:', { method: req.method, url: req.url });

  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight handled');
      return new Response(null, { headers: corsHeaders });
    }

    // Get configuration
    const onvoConfig = getOnvoConfig();
    const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');

    // Early diagnostics
    console.log('🧪 Env diagnostics:', {
      hasSecret: !!ONVOPAY_SECRET_KEY,
      onvoConfig: {
        baseUrl: onvoConfig.baseUrl,
        version: onvoConfig.version,
        path: onvoConfig.path,
        fullUrl: onvoConfig.fullUrl,
        debug: onvoConfig.debug,
      }
    });

    if (!ONVOPAY_SECRET_KEY) {
      console.error('❌ Missing ONVOPAY_SECRET_KEY environment variable');
      return new Response(JSON.stringify({
        error: 'CONFIGURATION_ERROR',
        message: 'Configuración de OnvoPay incompleta - falta secret key',
        hint: 'Contacta al administrador para configurar ONVOPAY_SECRET_KEY'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('🔑 Using OnvoPay secret key:', '***' + ONVOPAY_SECRET_KEY.slice(-4));
    console.log('🌐 OnvoPay API URL:', onvoConfig.fullUrl);
    if (onvoConfig.debug) {
      console.log('🐛 Debug mode enabled');
    }

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    currentPhase = 'parse-body';
    console.log('📦 Parsing request body...');
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error('❌ Invalid JSON body:', e);
      return new Response(JSON.stringify({
        error: 'INVALID_JSON',
        message: 'El cuerpo del request no es JSON válido',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('📋 Request data received:', {
      hasAppointmentId: !!body.appointmentId,
      hasAmount: !!body.amount,
      hasPaymentType: !!body.payment_type,
      appointmentId: body.appointmentId,
      hasCardData: !!body.card_data,
      hasBillingInfo: !!body.billing_info,
      cardData: body.card_data ? {
        hasNumber: !!body.card_data.number,
        hasExpiry: !!body.card_data.expiry,
        hasCvv: !!body.card_data.cvv,
        hasName: !!body.card_data.name
      } : null
    });

    // Input validation
    currentPhase = 'validate-input';
    const missing: string[] = [];
    if (!body.appointmentId) missing.push('appointmentId');
    if (typeof body.amount !== 'number') missing.push('amount');
    if (!body.card_data) missing.push('card_data');
    else {
      if (!body.card_data.number) missing.push('card_data.number');
      if (!body.card_data.expiry) missing.push('card_data.expiry');
      if (!body.card_data.cvv) missing.push('card_data.cvv');
      if (!body.card_data.name) missing.push('card_data.name');
    }
    if (!body.billing_info) missing.push('billing_info');
    else {
      if (!body.billing_info.phone) missing.push('billing_info.phone');
      if (!body.billing_info.address) missing.push('billing_info.address');
    }
    if (missing.length > 0) {
      console.error('❌ Validation failed. Missing fields:', missing);
      return new Response(JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'Campos requeridos faltantes o inválidos',
        missing,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get appointment details
    currentPhase = 'fetch-appointment';
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('client_id, provider_id, listing_id')
      .eq('id', body.appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error('❌ Appointment not found:', appointmentError);
      return new Response(JSON.stringify({
        error: 'APPOINTMENT_NOT_FOUND',
        message: 'No se encontró la cita especificada',
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Calculate amounts in cents
    const amountCents = Math.round(body.amount * 100); // Convert USD to cents
    const subtotalCents = Math.round(amountCents / 1.13); // Remove IVA (13%)
    const ivaCents = amountCents - subtotalCents;

    console.log('💰 Payment calculation:', {
      originalAmount: body.amount,
      amountCents,
      subtotalCents,
      ivaCents,
      paymentType: body.payment_type
    });

    // Prepare OnvoPay API request
    currentPhase = 'prepare-onvopay-request';

    const onvoPayData = {
      amount: amountCents,
      currency: 'USD',
      card: {
        number: body.card_data.number,
        exp_month: body.card_data.expiry.split('/')[0],
        exp_year: body.card_data.expiry.split('/')[1],
        cvc: body.card_data.cvv
      },
      billing_details: {
        name: body.card_data.name,
        phone: body.billing_info.phone,
        address: {
          line1: body.billing_info.address
        }
      },
      metadata: {
        appointment_id: body.appointmentId,
        client_id: appointment.client_id,
        provider_id: appointment.provider_id
      }
    };

    console.log('📡 OnvoPay request payload:', {
      amount: onvoPayData.amount,
      currency: onvoPayData.currency,
      hasCard: !!onvoPayData.card,
      hasBilling: !!onvoPayData.billing_details,
      metadata: onvoPayData.metadata
    });

    // Make the actual API call to OnvoPay
    currentPhase = 'call-onvopay';
    console.log('🚀 Calling OnvoPay API...');
    
    const onvoResponse = await fetch(onvoConfig.fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onvoPayData)
    });

    // Read response body ONCE to avoid "Body already consumed" error
    const responseText = await onvoResponse.text();
    let onvoResult;
    
    try {
      onvoResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse OnvoPay response as JSON:', parseError);
      console.error('❌ Raw response:', onvoConfig.debug ? responseText : responseText.substring(0, 200) + '...');
      
      return new Response(JSON.stringify({
        error: 'INVALID_RESPONSE',
        message: 'OnvoPay devolvió una respuesta inválida',
        status: onvoResponse.status,
        statusText: onvoResponse.statusText,
        url: onvoConfig.fullUrl,
        hint: onvoResponse.status === 404 ? 'Posible endpoint incorrecto (sandbox/prod o versión de API)' : undefined
      }), { 
        status: onvoResponse.status || 502, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('🔍 OnvoPay API response:', {
      status: onvoResponse.status,
      ok: onvoResponse.ok,
      hasId: !!onvoResult.id,
      status_field: onvoResult.status,
      hasError: !!onvoResult.error,
      url: onvoConfig.fullUrl
    });

    if (!onvoResponse.ok || onvoResult.error) {
      console.error('❌ OnvoPay API error:', {
        status: onvoResponse.status,
        statusText: onvoResponse.statusText,
        url: onvoConfig.fullUrl,
        error: onvoResult.error || onvoResult,
        message: onvoResult.message,
        method: 'POST'
      });
      
      if (onvoConfig.debug) {
        console.error('❌ Full OnvoPay response (debug):', onvoResult);
        console.error('❌ Raw response (debug):', 'Response body already consumed');
      }
      
      // Return structured error to frontend
      return new Response(JSON.stringify({
        error: 'ONVOPAY_API_ERROR',
        message: onvoResult.error?.message || onvoResult.message || 'Error en procesamiento de pago',
        status: onvoResponse.status,
        statusText: onvoResponse.statusText,
        url: onvoConfig.fullUrl,
        hint: onvoResponse.status === 404 ? 'Posible endpoint incorrecto (sandbox/prod o /v1 vs sin /v1; guiones vs guiones bajos)' : undefined,
        onvoPayError: onvoResult.error
      }), { 
        status: onvoResponse.status || 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Determine status based on OnvoPay response
    const status = onvoResult.status === 'succeeded' ? 'captured' : 'pending_authorization';
    const now = new Date().toISOString();
    const authorizedAt = (status === 'captured' || status === 'authorized') ? now : null;
    const capturedAt = status === 'captured' ? now : null;

    console.log('💾 Creating payment record with OnvoPay data...');
    currentPhase = 'create-payment-record';
    
    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('onvopay_payments')
      .insert({
        appointment_id: body.appointmentId,
        client_id: appointment.client_id,
        provider_id: appointment.provider_id,
        amount: amountCents,
        subtotal: subtotalCents,
        iva_amount: ivaCents,
        commission_amount: 0,
        status: status,
        payment_type: body.payment_type,
        payment_method: 'card',
        currency: 'USD',
        billing_info: body.billing_info || {},
        card_info: {
          last4: body.card_data.number.slice(-4),
          brand: 'visa', // Default for now
          exp_month: body.card_data.expiry.split('/')[0],
          exp_year: body.card_data.expiry.split('/')[1]
        },
        authorized_at: authorizedAt,
        captured_at: capturedAt,
        onvopay_payment_id: onvoResult.id,
        onvopay_transaction_id: onvoResult.charges?.data?.[0]?.id || onvoResult.id,
        external_reference: body.appointmentId,
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('❌ Payment creation failed:', paymentError);
      throw new Error('Failed to create payment record');
    }

    console.log('✅ Payment record created:', {
      paymentId: payment.id,
      onvoPayId: payment.onvopay_payment_id,
      status: payment.status,
      amount: payment.amount
    });

    // Update appointment with payment ID
    currentPhase = 'update-appointment';
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ onvopay_payment_id: payment.id })
      .eq('id', body.appointmentId);

    if (updateError) {
      console.error('❌ Failed to update appointment:', updateError);
      // Don't throw error here, payment was already created
    }

    const successResponse = {
      success: true,
      id: payment.id, // The UUID that exists in the database
      payment_id: payment.id, // For backwards compatibility
      appointment_id: body.appointmentId,
      status: status,
      onvopay_payment_id: payment.onvopay_payment_id,
      onvopay_transaction_id: payment.onvopay_transaction_id,
      amount: body.amount,
      currency: 'USD',
      message: status === 'captured' 
        ? 'Pago procesado exitosamente.'
        : 'Pago autorizado. Pendiente de captura.',
      timestamp: now,
      onvopay_status: onvoResult.status,
      onvopay_raw: {
        id: onvoResult.id,
        status: onvoResult.status,
        amount: onvoResult.amount
      }
    };

    console.log('✅ Returning success response:', {
      paymentId: payment.id,
      onvoStatus: onvoResult.status,
      finalStatus: status
    });

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Function error:', {
      phase: typeof currentPhase !== 'undefined' ? currentPhase : 'unknown',
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 300)
    });

    const status = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;

    return new Response(JSON.stringify({
      error: 'FUNCTION_ERROR',
      message: error.message || 'Error procesando la autorización de pago',
      success: false,
      timestamp: new Date().toISOString(),
      phase: typeof currentPhase !== 'undefined' ? currentPhase : 'unknown',
      debug: {
        error_type: error.name,
        has_stack: !!error.stack
      }
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});