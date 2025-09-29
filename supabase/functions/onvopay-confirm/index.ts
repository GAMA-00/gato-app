import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Service bypass configuration - same as authorize
const CUSTOMER_OPTIONAL = (Deno.env.get('ONVOPAY_CUSTOMER_OPTIONAL') ?? 'true').toLowerCase() === 'true';

// OnvoPay API configuration - unified with onvopay-authorize
const getOnvoConfig = () => {
  const baseUrl = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com';
  const version = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  const debug = (Deno.env.get('ONVOPAY_DEBUG') || 'false') === 'true';
  
  return {
    baseUrl,
    version,
    debug,
    fullUrl: `${baseUrl}/${version}`
  };
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log('🚀 ONVOPAY CONFIRM - Function started', {
    requestId,
    timestamp: new Date().toISOString()
  });
  console.log('🔎 Request info:', { 
    requestId,
    method: req.method, 
    url: req.url 
  });

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

    // Check if using saved payment method or new card data
    const usingSavedPaymentMethod = body.card_data?.payment_method_id;

    if (!usingSavedPaymentMethod) {
      // Validate card data for new cards
      if (!body.card_data) missing.push('card_data');
      else {
        if (!body.card_data.number) missing.push('card_data.number');
        if (!body.card_data.expiry) missing.push('card_data.expiry');
        if (!body.card_data.cvv) missing.push('card_data.cvv');
        if (!body.card_data.name) missing.push('card_data.name');
      }
      if (!body.billing_info) missing.push('billing_info');
    }

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

    // 1) Get or Create Payment Method
    let paymentMethodId: string;

    if (usingSavedPaymentMethod) {
      // Use existing saved payment method
      paymentMethodId = body.card_data.payment_method_id;
      console.log('🔄 Using saved payment method:', paymentMethodId);
    } else {
      // Create Payment Method from raw card data
      const pmCreateUrl = `${onvoConfig.fullUrl}/payment-methods`;

      // Parse expiry (supports MM/YY or MM/YYYY)
      const rawExpiry = String(body.card_data.expiry || '').trim();
      const cleanedExpiry = rawExpiry.replace(/\s/g, '');
      const [mmStr, yyStr] = cleanedExpiry.split('/');
      const expMonth = Number.parseInt(mmStr, 10);
      let expYear = Number.parseInt(yyStr, 10);
      if (yyStr && yyStr.length === 2 && Number.isInteger(expYear)) {
        expYear = 2000 + expYear; // normalize to 20xx
      }

      if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
        console.error('❌ Invalid expMonth parsed from expiry:', { rawExpiry, expMonth });
        return new Response(JSON.stringify({
          error: 'INVALID_EXP_MONTH',
          message: 'El mes de expiración de la tarjeta es inválido'
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(expYear) || expYear < currentYear || expYear > 2100) {
        console.error('❌ Invalid expYear parsed from expiry:', { rawExpiry, expYear });
        return new Response(JSON.stringify({
          error: 'INVALID_EXP_YEAR',
          message: 'El año de expiración de la tarjeta es inválido'
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const holderName = String(body.card_data.name || '').trim();
      if (!holderName) {
        return new Response(JSON.stringify({
          error: 'INVALID_HOLDER_NAME',
          message: 'El nombre del titular es requerido'
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const pmPayload = {
        type: 'card',
        card: {
          number: String(body.card_data.number || '').replace(/\s+/g, ''),
          expMonth,
          expYear,
          cvv: String(body.card_data.cvv || ''),
          holderName
        }
      };

      console.log('📡 Creating Payment Method in OnvoPay (payload summary)...', {
        hasNumber: !!pmPayload.card.number,
        expMonth: pmPayload.card.expMonth,
        expYear: pmPayload.card.expYear,
        hasCVV: !!pmPayload.card.cvv,
        hasHolderName: !!pmPayload.card.holderName
      });

      const pmResponse = await fetch(pmCreateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pmPayload)
      });

      const pmText = await pmResponse.text();
      const pmContentType = pmResponse.headers.get('content-type') ?? '';

      console.log('🔍 Payment Method response info:', {
        status: pmResponse.status,
        contentType: pmContentType,
        bodyLength: pmText.length,
        isHTML: pmContentType.includes('text/html'),
        isJSON: pmContentType.includes('application/json')
      });

      if (!pmContentType.includes('application/json')) {
        const isHTML = pmContentType.includes('text/html') || pmText.trim().startsWith('<');

        // CRITICAL BYPASS: If OnvoPay service is down and customer bypass is enabled
        if (CUSTOMER_OPTIONAL && (pmResponse.status === 502 || pmResponse.status === 503 || pmResponse.status === 504)) {
          console.warn('⚠️ OnvoPay payment method service unavailable, activating bypass', {
            paymentIntentId: body.payment_intent_id,
            status: pmResponse.status,
            customerOptional: CUSTOMER_OPTIONAL,
            bypassing: true
          });

          return new Response(JSON.stringify({
            success: false,
            error: 'PAYMENT_SERVICE_UNAVAILABLE',
            message: 'El servicio de pagos está temporalmente no disponible. Por favor, intente nuevamente en unos minutos.',
            hint: 'OnvoPay Payment Method API is temporarily down'
          }), {
            status: 200, // Return 200 to avoid throwing error in client
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.error('❌ Non-JSON response creating Payment Method');
        return new Response(JSON.stringify({
          error: 'NON_JSON_RESPONSE',
          message: isHTML
            ? 'OnvoPay returned an HTML error page instead of JSON. This usually indicates service unavailability.'
            : 'OnvoPay returned a non-JSON response when creating payment method',
          status: pmResponse.status,
          bodyPreview: pmText.substring(0, 300) + (pmText.length > 300 ? '...' : '')
        }), { status: pmResponse.status || 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      let pmResult: any;
      try {
        pmResult = JSON.parse(pmText);
      } catch (e) {
        console.error('❌ Invalid JSON creating Payment Method');
        return new Response(JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON from payment-methods' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!pmResponse.ok || pmResult.error) {
        console.error('❌ OnvoPay payment-methods error:', pmResult);
        return new Response(JSON.stringify({
          error: 'ONVOPAY_PAYMENT_METHOD_ERROR',
          message: pmResult.error?.message || 'Error creando método de pago',
          status: pmResponse.status,
          onvoPayError: pmResult.error
        }), { status: pmResponse.status || 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      paymentMethodId = String(pmResult.id);
      console.log('✅ Created new payment method:', paymentMethodId);
    }

    // 2) Confirm Payment Intent with paymentMethodId only (per OnvoPay spec)
    const confirmUrl = `${onvoConfig.fullUrl}/payment-intents/${body.payment_intent_id}/confirm`;
    const confirmData: Record<string, any> = { paymentMethodId };

    console.log('📦 Confirm payload summary:', {
      hasPaymentMethodId: !!paymentMethodId,
      confirmUrl,
    });

    console.log('📡 Confirming Payment Intent with OnvoPay...');
    
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
      bodyLength: responseText.length,
      isHTML: contentType.includes('text/html'),
      isJSON: contentType.includes('application/json')
    });

    if (!contentType.includes('application/json')) {
      const isHTML = contentType.includes('text/html') || responseText.trim().startsWith('<');
      
      // CRITICAL BYPASS: If OnvoPay service is down and customer bypass is enabled
      if (CUSTOMER_OPTIONAL && (onvoResponse.status === 502 || onvoResponse.status === 503 || onvoResponse.status === 504)) {
        console.warn('⚠️ OnvoPay confirm service unavailable, activating bypass', {
          paymentIntentId: body.payment_intent_id,
          status: onvoResponse.status,
          customerOptional: CUSTOMER_OPTIONAL,
          bypassing: true
        });
        
        return new Response(JSON.stringify({
          success: false,
          error: 'PAYMENT_SERVICE_UNAVAILABLE',
          message: 'El servicio de pagos está temporalmente no disponible. Por favor, intente nuevamente en unos minutos.',
          hint: 'OnvoPay Confirm API is temporarily down'
        }), { 
          status: 200, // Return 200 to avoid throwing error in client
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      console.error('❌ Non-JSON response from OnvoPay confirm');
      return new Response(JSON.stringify({
        error: 'NON_JSON_RESPONSE',
        message: isHTML 
          ? 'OnvoPay returned an HTML error page instead of JSON. This usually indicates service unavailability.'
          : 'OnvoPay returned a non-JSON response',
        status: onvoResponse.status,
        bodyPreview: responseText.substring(0, 300) + (responseText.length > 300 ? '...' : '')
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

    // Determine final status based on OnvoPay response
    // With capture_method: manual, payment should be 'requires_capture' after confirmation (authorized but not captured)
    // Status mapping:
    // - 'requires_capture' -> 'authorized' (payment authorized, waiting for capture after service completion)
    // - 'succeeded' -> 'captured' (payment fully processed - shouldn't happen with manual capture)
    const onvoStatus = onvoResult.status || 'unknown';
    let finalStatus = 'authorized';

    if (onvoStatus === 'succeeded') {
      finalStatus = 'captured'; // Payment was captured immediately (shouldn't happen with manual capture)
    } else if (onvoStatus === 'requires_capture') {
      finalStatus = 'authorized'; // Payment authorized, ready for capture after service completion
    }

    const now = new Date().toISOString();

    console.log('💡 Payment confirmation result:', {
      onvoStatus,
      finalStatus,
      requiresCapture: onvoStatus === 'requires_capture',
      paymentIntentId: body.payment_intent_id
    });

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
      onvopay_payment_method_id: paymentMethodId, // Return payment method ID for card storage
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