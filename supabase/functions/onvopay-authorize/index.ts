import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Customer bypass configuration
const CUSTOMER_OPTIONAL = (Deno.env.get('ONVOPAY_CUSTOMER_OPTIONAL') ?? 'true').toLowerCase() === 'true';

// Environment configuration - unified with onvopay-confirm
function getOnvoConfig() {
  const baseUrl = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com';
  const version = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  const path = Deno.env.get('ONVOPAY_API_PATH_CUSTOMERS') || '/v1/customers';
  const debug = (Deno.env.get('ONVOPAY_DEBUG') || 'false') === 'true';
  
  return {
    baseUrl,
    version,
    path,
    debug,
    fullUrl: `${baseUrl}/${version}/payment-intents` // Fixed: hyphens instead of underscores
  };
}

// Normalize data for consistent searching
function normalizeData(data: any) {
  return {
    email: data.email ? data.email.trim().toLowerCase() : '',
    phone: data.phone ? data.phone.replace(/[^0-9]/g, '') : '',
    name: data.name ? data.name.trim() : ''
  };
}

// Robust customer creation/retrieval helper
async function ensureOnvoCustomer(supabase: any, clientId: string): Promise<string> {
  const config = getOnvoConfig();
  const secretKey = Deno.env.get('ONVOPAY_SECRET_KEY');
  
  if (!secretKey) {
    throw new Error('ONVOPAY_SECRET_KEY not configured');
  }

  // Step 1: Check if customer mapping already exists
  const { data: existingCustomer } = await supabase
    .from('onvopay_customers')
    .select('onvopay_customer_id')
    .eq('client_id', clientId)
    .single();

  if (existingCustomer?.onvopay_customer_id) {
    if (config.debug) {
      console.log(`🔄 Reusing existing OnvoPay customer: ${existingCustomer.onvopay_customer_id}`);
    }
    return existingCustomer.onvopay_customer_id;
  }

  // Step 2: Get user data for customer creation
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email, phone')
    .eq('id', clientId)
    .single();

  if (userError || !user) {
    throw new Error(`User not found: ${clientId}`);
  }

  const normalized = normalizeData(user);

  // Step 3: Validate required data (anti "blank customer")
  if (!normalized.email && !normalized.phone) {
    throw {
      code: 'MISSING_USER_DATA',
      status: 400,
      hint: 'Se requiere email o phone para crear el cliente en OnvoPay'
    };
  }

  // Step 4: Create customer in OnvoPay API
  const payload = {
    name: normalized.name || 'Sin nombre',
    ...(normalized.email && { email: normalized.email }),
    ...(normalized.phone && { phone: normalized.phone }),
    metadata: { internal_client_id: clientId }
  };

  const url = `${config.baseUrl}${config.path}`;
  const headers = {
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/json'
  };

  let attempt = 0;
  const maxRetries = 2;
  
  while (attempt <= maxRetries) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      const contentType = response.headers.get('content-type') || '';
      const duration = Date.now() - startTime;

      if (config.debug) {
        console.log(`📡 OnvoPay customer API call (attempt ${attempt + 1}):`, {
          method: 'POST',
          url,
          status: response.status,
          duration: `${duration}ms`,
          contentType,
          preview: responseText.slice(0, 256)
        });
      }

      let parsed = null;
      if (contentType.includes('application/json')) {
        try {
          parsed = JSON.parse(responseText);
        } catch {
          // Invalid JSON in response
        }
      }

      if (!response.ok) {
        // Retry logic for server errors and non-JSON responses (WAF/503)
        if (attempt < maxRetries && (response.status >= 500 || !contentType.includes('application/json'))) {
          attempt++;
          const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying OnvoPay customer API call in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }

        // Final error after retries
        const hint = contentType.includes('text/html') 
          ? 'Proveedor devolvió HTML (503/maintenance/WAF). No es JSON.'
          : response.status === 404 
          ? 'Revisa base, versión (/v1) y endpoint /customers'
          : 'Error en API de OnvoPay';

        throw {
          code: 'ONVO_API_ERROR',
          status: response.status,
          hint,
          provider: parsed || responseText.slice(0, 1024)
        };
      }

      // Success - validate response format
      if (!parsed || !parsed.id) {
        throw {
          code: 'ONVO_API_FORMAT',
          status: 400,
          hint: 'Respuesta de OnvoPay sin ID de cliente'
        };
      }

      const customerId = parsed.id;

      // Step 5: Save customer mapping to database
      const { error: insertError } = await supabase
        .from('onvopay_customers')
        .insert({
          client_id: clientId,
          onvopay_customer_id: customerId,
          customer_data: parsed,
          normalized_email: normalized.email || null,
          normalized_phone: normalized.phone || null,
          normalized_name: normalized.name || null,
          synced_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Failed to save OnvoPay customer mapping:', insertError);
        throw {
          code: 'DB_UPDATE_ERROR',
          status: 500,
          hint: 'No se pudo guardar el mapeo del cliente',
          details: insertError.message
        };
      }

      if (config.debug) {
        console.log(`✅ Created and saved OnvoPay customer: ${customerId}`);
      }

      return customerId;

    } catch (error: any) {
      if (error.code) {
        // Re-throw our custom errors
        throw error;
      }
      
      // Network or other unexpected errors
      if (attempt < maxRetries) {
        attempt++;
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Network error, retrying in ${backoffMs}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      
      throw {
        code: 'NETWORK_ERROR',
        status: 500,
        hint: 'Error de red al conectar con OnvoPay',
        details: error.message
      };
    }
  }

  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  // Diagnostics tracking
  let currentPhase = 'start';
  console.log('🚀 ONVOPAY AUTHORIZE - Function started');
  console.log('🔎 Request info:', { method: req.method, url: req.url });

  try {
    // Handle CORS preflight requests
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

    // Get listing to determine if post-payment
    currentPhase = 'fetch-listing';
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('is_post_payment')
      .eq('id', appointment.listing_id)
      .single();

    if (listingError) {
      console.warn('⚠️ Could not fetch listing.is_post_payment, defaulting to false:', listingError);
    }

    // Calculate amounts in cents
    const amountCents = Math.round(body.amount * 100);
    const subtotalCents = Math.round(amountCents / 1.13);
    const ivaCents = amountCents - subtotalCents;

    // Check if service is post-payment
    const isPostPayment = (listing && typeof listing.is_post_payment === 'boolean') ? listing.is_post_payment : false;
    
    // **CRITICAL: Ensure OnvoPay customer exists before creating payment intent**
    currentPhase = 'ensure-onvopay-customer';
    let customerId: string | undefined;
    try {
      customerId = await ensureOnvoCustomer(supabase, appointment.client_id);
    } catch (err: any) {
      const s = Number(err?.status);
      const isServiceDown = s === 502 || s === 503 || s === 504 || /HTML|WAF|maintenance/i.test(String(err?.hint ?? err?.message));
      
      if (isServiceDown && CUSTOMER_OPTIONAL) {
        console.warn('⚠️ Skipping OnvoPay customer association due to service unavailability', {
          appointmentId: body.appointmentId,
          clientId: appointment.client_id,
          status: s,
          error: err?.code || 'UNKNOWN'
        });
        customerId = undefined;
      } else {
        console.error('❌ Failed to ensure OnvoPay customer:', err);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: err.code || 'CUSTOMER_CREATION_FAILED',
            message: err.hint || 'No se pudo crear o encontrar el cliente en OnvoPay',
            details: err.details || err.message
          }),
          { 
            status: err.status || 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

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
        is_post_payment: isPostPayment.toString()
      }
    };

    // Include customer_id only if available
    if (customerId) {
      onvoPayData.customer = customerId;
    }

    // Create Payment Intent with retry logic and structured logging
    const requestId = crypto.randomUUID();
    const paymentIntentStartTime = Date.now();
    console.log('🔐 Creating Payment Intent...', {
      requestId,
      appointmentId: body.appointmentId,
      amount: amountCents,
      timestamp: new Date().toISOString()
    });
    
    const onvoUrl = `${onvoConfig.baseUrl}/v1/payment-intents`; // Fixed: hyphens instead of underscores
    
    let attempt = 0;
    const maxRetries = 2;
    let onvoResponse: Response | undefined;
    let onvoResult: any;
    
    while (attempt <= maxRetries) {
      try {
        onvoResponse = await fetch(onvoUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(onvoPayData),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        const responseText = await onvoResponse.text();
        const contentType = onvoResponse.headers.get('content-type') || '';
        const responseTimeMs = Date.now() - paymentIntentStartTime;

        console.log(`📡 Payment Intent API response (attempt ${attempt + 1}):`, {
          requestId,
          status: onvoResponse.status,
          responseTimeMs,
          contentType,
          url: onvoUrl,
          hasContent: responseText.length > 0
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
          
          // Enhanced error handling for OnvoPay service  
          if (CUSTOMER_OPTIONAL && onvoResponse && (onvoResponse.status === 502 || onvoResponse.status === 503 || onvoResponse.status === 504)) {
            console.warn('⚠️ OnvoPay payment service unavailable, activating bypass', {
              requestId,
              appointmentId: body.appointmentId,
              status: onvoResponse.status,
              customerOptional: CUSTOMER_OPTIONAL,
              bypassing: true
            });
            
            return new Response(JSON.stringify({
              success: false,
              error: 'PAYMENT_SERVICE_UNAVAILABLE',
              message: 'El servicio de pagos está temporalmente no disponible. Por favor, intente nuevamente en unos minutos.',
              hint: 'OnvoPay API is temporarily down',
              debug: {
                requestId,
                status: onvoResponse.status
              }
            }), { 
              status: 200, // Return 200 for frontend handling
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
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

        // Exit retry loop on successful response
        break;

      } catch (error: any) {
        console.error(`❌ Payment Intent API call failed (attempt ${attempt + 1}):`, error.message);
        
        if (attempt < maxRetries && (error.name === 'TimeoutError' || error.message.includes('network'))) {
          attempt++;
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying Payment Intent API call in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        // Final network error after retries
        return new Response(JSON.stringify({
          error: 'NETWORK_ERROR',
          message: 'Error de red conectando con OnvoPay. Intenta nuevamente.',
          details: error.message,
          requestId
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // Ensure onvoResponse is defined
    if (!onvoResponse) {
      return new Response(JSON.stringify({
        error: 'NETWORK_ERROR',
        message: 'No se pudo conectar con OnvoPay después de múltiples intentos',
        requestId
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!onvoResponse.ok || onvoResult.error) {
      console.error('❌ OnvoPay API error:', {
        status: onvoResponse.status,
        statusText: onvoResponse.statusText,
        url: onvoConfig.fullUrl,
        error: onvoResult.error || onvoResult,
        message: onvoResult.message,
        method: 'POST'
      });
      
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
    const dbStatus = 'pending_authorization';
    const now = new Date().toISOString();

    // Create payment record in database
    currentPhase = 'create-payment-record';
    const { data: payment, error: paymentError } = await supabase
      .from('onvopay_payments')
      .insert({
        appointment_id: body.appointmentId,
        client_id: appointment.client_id,
        provider_id: appointment.provider_id,
        amount: amountCents,
        subtotal: subtotalCents,
        iva_amount: ivaCents,
        currency: 'USD',
        status: dbStatus,
        payment_type: body.payment_type || 'appointment',
        payment_method: 'card',
        billing_info: body.billing_info,
        card_info: {
          last4: body.card_data.number.slice(-4),
          brand: 'visa',
          exp_month: body.card_data.expiry.split('/')[0],
          exp_year: body.card_data.expiry.split('/')[1]
        },
        authorized_at: null,
        captured_at: null,
        onvopay_payment_id: onvoResult.id,
        onvopay_transaction_id: onvoResult.charges?.data?.[0]?.id || onvoResult.id,
        external_reference: body.appointmentId,
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