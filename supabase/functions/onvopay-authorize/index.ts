import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OnvoPay API configuration - Environment based
const getOnvoConfig = () => {
  const ONVOPAY_API_BASE = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com'; // Use production API
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

    // Get listing to determine if post-payment (avoid joins due to missing FK)
    currentPhase = 'fetch-listing';
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('is_post_payment')
      .eq('id', appointment.listing_id)
      .single();

    if (listingError) {
      console.warn('⚠️ Could not fetch listing.is_post_payment, defaulting to false:', listingError);
    }

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

    // Check if service is post-payment
    const isPostPayment = (listing && typeof listing.is_post_payment === 'boolean') ? listing.is_post_payment : false;
    
    console.log('📋 Service payment type:', {
      isPostPayment,
      listingId: appointment.listing_id
    });

    // Prepare OnvoPay API request - CREATE Payment Intent only
    currentPhase = 'prepare-onvopay-request';
    const onvoPayData: any = {
      amount: amountCents,
      currency: 'USD',
      description: `Servicio ${body.appointmentId}`,
      metadata: {
        appointment_id: body.appointmentId,
        client_id: appointment.client_id,
        provider_id: appointment.provider_id,
        is_post_payment: isPostPayment
      }
    };

    console.log('📡 OnvoPay request payload:', {
      amount: onvoPayData.amount,
      currency: onvoPayData.currency,
      hasMetadata: !!onvoPayData.metadata,
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
    const contentType = onvoResponse.headers.get('content-type') ?? '';
    let onvoResult;
    
    console.log('🔍 OnvoPay response info:', {
      status: onvoResponse.status,
      contentType: contentType,
      bodyLength: responseText.length,
      isHTML: contentType.includes('text/html'),
      isJSON: contentType.includes('application/json')
    });
    
    // Check if response is JSON before parsing
    if (!contentType.includes('application/json')) {
      const isHTML = contentType.includes('text/html') || responseText.trim().startsWith('<');
      const hint = onvoResponse.status === 503 
        ? 'OnvoPay service temporarily unavailable (503). This usually means maintenance or API overload.'
        : onvoResponse.status === 404
        ? 'Endpoint not found. Check: 1) API base URL (sandbox vs prod), 2) API version (/v1), 3) Resource name (payment-intents with hyphens)'
        : onvoResponse.status === 401
        ? 'Invalid ONVOPAY_SECRET_KEY or missing Authorization header'
        : onvoResponse.status === 500
        ? 'OnvoPay internal server error. Try again in a few minutes.'
        : `Non-JSON response from OnvoPay (${contentType})`;
      
      console.error('❌ Non-JSON response from OnvoPay:', {
        status: onvoResponse.status,
        contentType,
        isHTML,
        bodyPreview: responseText.substring(0, 300) + (responseText.length > 300 ? '...' : '')
      });
      
      // Debug fallback: try alternative endpoint only in sandbox debug mode
      if (onvoConfig.debug && onvoResponse.status === 404 && onvoConfig.baseUrl.includes('dev.onvopay.com')) {
        const alternativeUrl = `${onvoConfig.baseUrl}/payment-intents`; // Without /v1
        console.log('🔧 Debug: Trying alternative endpoint:', alternativeUrl);
        
        try {
          const altResponse = await fetch(alternativeUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(onvoPayData)
          });
          
          console.log('🔧 Alternative endpoint result:', {
            status: altResponse.status,
            contentType: altResponse.headers.get('content-type'),
            url: alternativeUrl
          });
        } catch (altError) {
          console.log('🔧 Alternative endpoint also failed:', altError.message);
        }
      }
      
      return new Response(JSON.stringify({
        error: 'NON_JSON_RESPONSE',
        message: isHTML 
          ? 'OnvoPay returned an HTML error page instead of JSON. This usually indicates service unavailability or incorrect endpoint.'
          : 'OnvoPay returned a non-JSON response. Check API configuration.',
        status: onvoResponse.status,
        statusText: onvoResponse.statusText,
        contentType: contentType,
        url: onvoConfig.fullUrl,
        hint: hint,
        bodyPreview: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
      }), { 
        status: onvoResponse.status >= 400 ? onvoResponse.status : 502, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Now safely parse JSON
    try {
      onvoResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON despite correct Content-Type:', parseError);
      console.error('❌ Raw response:', responseText.substring(0, 500) + '...');
      
      return new Response(JSON.stringify({
        error: 'INVALID_JSON',
        message: 'OnvoPay returned malformed JSON',
        status: onvoResponse.status,
        statusText: onvoResponse.statusText,
        url: onvoConfig.fullUrl,
        bodyPreview: responseText.substring(0, 300) + '...'
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

    // Determine status - Payment Intent created, ready for confirmation
    const paymentIntentStatus = onvoResult.status || 'requires_payment_method';
    const dbStatus = isPostPayment ? 'pending_authorization' : 'requires_confirmation';
    const now = new Date().toISOString();
    
    console.log('💰 Payment status determination:', {
      onvoPayStatus: paymentIntentStatus,
      isPostPayment,
      finalDbStatus: dbStatus
    });

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
        status: dbStatus,
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
        authorized_at: null, // Will be set when confirmed
        captured_at: null, // Will be set when captured
        onvopay_payment_id: onvoResult.id,
        onvopay_transaction_id: onvoResult.charges?.data?.[0]?.id || onvoResult.id,
        external_reference: body.appointmentId,
        // Store encrypted card data for later confirmation if post-payment
        onvopay_response: isPostPayment ? {
          card_data_encrypted: JSON.stringify({
            last4: body.card_data.number.slice(-4),
            exp_month: body.card_data.expiry.split('/')[0],
            exp_year: body.card_data.expiry.split('/')[1],
            name: body.card_data.name
          }),
          billing_info: body.billing_info
        } : onvoResult,
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
      id: payment.id,
      payment_id: payment.id,
      appointment_id: body.appointmentId,
      status: dbStatus,
      onvopay_payment_id: payment.onvopay_payment_id,
      onvopay_transaction_id: payment.onvopay_transaction_id,
      amount: body.amount,
      currency: 'USD',
      is_post_payment: isPostPayment,
      requires_confirmation: !isPostPayment,
      message: isPostPayment 
        ? 'Payment Intent creado. Pago se procesará al completar el servicio.'
        : 'Payment Intent creado. Procediendo con confirmación.',
      timestamp: now,
      onvopay_status: paymentIntentStatus,
      onvopay_raw: {
        id: onvoResult.id,
        status: paymentIntentStatus,
        amount: onvoResult.amount
      }
    };

    console.log('✅ Returning success response:', {
      paymentId: payment.id,
      onvoStatus: paymentIntentStatus,
      finalStatus: dbStatus,
      isPostPayment,
      requiresConfirmation: !isPostPayment
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