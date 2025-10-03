/**
 * OnvoPay Payment Authorization Edge Function
 * 
 * This function handles payment authorization for appointments using the OnvoPay API.
 * It creates payment intents with proper customer management and error handling.
 * 
 * Key Features:
 * - Customer deduplication and creation
 * - Payment intent creation with retry logic
 * - Support for post-payment services
 * - Comprehensive error handling and logging
 * - CORS support for frontend integration
 * 
 * @module onvopay-authorize
 * @see https://docs.onvopay.com/api
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Module imports
import { corsHeaders, CUSTOMER_OPTIONAL, getOnvoConfig, getRequiredEnv } from './config.ts';
import { calculateAmounts, isServiceDownError } from './utils.ts';
import { ensureOnvoCustomer } from './customer.ts';
import { createPaymentIntent } from './payment.ts';
import type { AuthorizePaymentRequest } from './types.ts';

/**
 * Main request handler
 */
serve(async (req) => {
  let currentPhase = 'start';
  console.log('🚀 ONVOPAY AUTHORIZE - Function started');
  console.log('🔎 Request:', { method: req.method, url: req.url });

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight handled');
      return new Response(null, { headers: corsHeaders });
    }

    // Get configuration and environment variables
    const onvoConfig = getOnvoConfig();
    const { secretKey, supabaseUrl, supabaseServiceKey } = getRequiredEnv();

    console.log('🧪 Config:', {
      hasSecret: !!secretKey,
      baseUrl: onvoConfig.baseUrl,
      environment: onvoConfig.environment,
      debug: onvoConfig.debug
    });

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    currentPhase = 'parse-body';
    console.log('📦 Parsing request body...');
    
    let body: AuthorizePaymentRequest;
    try {
      body = await req.json();
    } catch (e) {
      console.error('❌ Invalid JSON body:', e);
      return new Response(JSON.stringify({
        error: 'INVALID_JSON',
        message: 'El cuerpo del request no es JSON válido',
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Validate required fields
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
      console.error('❌ Validation failed:', missing);
      return new Response(JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'Campos requeridos faltantes o inválidos',
        missing,
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Fetch appointment details
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
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Fetch listing to check if post-payment
    currentPhase = 'fetch-listing';
    const { data: listing } = await supabase
      .from('listings')
      .select('is_post_payment')
      .eq('id', appointment.listing_id)
      .single();

    const isPostPayment = listing?.is_post_payment ?? false;

    // Calculate payment amounts
    const { amountCents, subtotalCents, ivaCents } = calculateAmounts(body.amount);

    // Ensure OnvoPay customer exists
    currentPhase = 'ensure-onvopay-customer';
    let customerId: string | undefined;
    
    try {
      customerId = await ensureOnvoCustomer(supabase, appointment.client_id, body.billing_info);
    } catch (err: any) {
      // Check if we should bypass customer creation
      if (isServiceDownError(err) && CUSTOMER_OPTIONAL) {
        console.warn('⚠️ Bypassing customer creation (service unavailable)', {
          appointmentId: body.appointmentId,
          clientId: appointment.client_id,
          error: err?.code
        });
        customerId = undefined;
      } else {
        console.error('❌ Failed to ensure OnvoPay customer:', err);
        return new Response(JSON.stringify({ 
          success: false, 
          error: err.code || 'CUSTOMER_CREATION_FAILED',
          message: err.hint || 'No se pudo crear o encontrar el cliente en OnvoPay',
          details: err.details || err.message
        }), { 
          status: err.status || 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // Create payment intent
    currentPhase = 'create-payment-intent';
    const requestId = crypto.randomUUID();
    
    const paymentIntentData = {
      amount: amountCents,
      currency: 'USD',
      description: `Servicio ${body.appointmentId}`,
      metadata: {
        appointment_id: body.appointmentId,
        client_id: appointment.client_id,
        provider_id: appointment.provider_id,
        is_post_payment: isPostPayment.toString(),
        ...(customerId && { onvopay_customer_id: customerId })
      }
    };

    let onvoResult: any;
    try {
      onvoResult = await createPaymentIntent(paymentIntentData, secretKey, requestId);
    } catch (err: any) {
      // Handle service unavailability with CUSTOMER_OPTIONAL bypass
      if (err.status === 503 && CUSTOMER_OPTIONAL) {
        console.warn('⚠️ Payment service unavailable, bypass activated');
        return new Response(JSON.stringify({
          success: false,
          error: 'PAYMENT_SERVICE_UNAVAILABLE',
          message: 'El servicio de pagos está temporalmente no disponible. Por favor, intente nuevamente en unos minutos.',
          hint: 'OnvoPay API is temporarily down',
          debug: { requestId, status: err.status }
        }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Return error to client
      return new Response(JSON.stringify({
        error: err.code || 'PAYMENT_INTENT_FAILED',
        message: err.message || 'Error creando payment intent',
        status: err.status,
        hint: err.hint,
        onvoPayError: err.onvoPayError
      }), { 
        status: err.status || 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Save payment record in database
    currentPhase = 'create-payment-record';
    const now = new Date().toISOString();
    const dbStatus = 'pending_authorization';

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
    await supabase
      .from('appointments')
      .update({ onvopay_payment_id: payment.id })
      .eq('id', body.appointmentId);

    // Return success response
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
      onvopay_status: onvoResult.status,
      onvopay_raw: {
        id: onvoResult.id,
        status: onvoResult.status,
        amount: onvoResult.amount
      }
    };

    console.log('✅ Success:', {
      paymentId: payment.id,
      onvoStatus: onvoResult.status,
      isPostPayment
    });

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Function error:', {
      phase: currentPhase,
      message: error.message,
      stack: error.stack?.substring(0, 300)
    });

    return new Response(JSON.stringify({
      error: 'FUNCTION_ERROR',
      message: error.message || 'Error procesando la autorización de pago',
      success: false,
      timestamp: new Date().toISOString(),
      phase: currentPhase
    }), {
      status: error.statusCode || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
