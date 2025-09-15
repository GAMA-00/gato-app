import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OnvoPay API configuration
const ONVOPAY_API_BASE = 'https://api.onvopay.com';
const ONVOPAY_PUBLISHABLE_KEY = 'onvo_test_publishable_key_sywfkgKP1FcxiEOKQgs_s-4stxGD_IL0QnHTEyxAY5VtcdF4S2cC4Q9vu203IlESeMhCWT4RkdZhQWv4COUTTw';

serve(async (req) => {
  console.log('🚀 ONVOPAY AUTHORIZE - Function started');

  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight handled');
      return new Response(null, { headers: corsHeaders });
    }

    // Get the secret key from environment
    const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');
    
    if (!ONVOPAY_SECRET_KEY) {
      console.error('❌ Missing ONVOPAY_SECRET_KEY environment variable');
      throw new Error('Configuración de OnvoPay incompleta - falta secret key');
    }

    console.log('🔑 Using OnvoPay secret key:', ONVOPAY_SECRET_KEY ? '***' + ONVOPAY_SECRET_KEY.slice(-4) : 'NOT_SET');

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('📦 Parsing request body...');
    const body = await req.json();

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

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('client_id, provider_id, listing_id')
      .eq('id', body.appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error('❌ Appointment not found:', appointmentError);
      throw new Error('Appointment not found');
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

    // Call OnvoPay API for real payment processing
    console.log('🚀 Calling OnvoPay API...');
    
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
    const onvoResponse = await fetch(`${ONVOPAY_API_BASE}/v1/payment_intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onvoPayData)
    });

    const onvoResult = await onvoResponse.json();
    
    console.log('🔍 OnvoPay API response:', {
      status: onvoResponse.status,
      ok: onvoResponse.ok,
      hasId: !!onvoResult.id,
      status_field: onvoResult.status,
      hasError: !!onvoResult.error
    });

    if (!onvoResponse.ok || onvoResult.error) {
      console.error('❌ OnvoPay API error:', {
        status: onvoResponse.status,
        statusText: onvoResponse.statusText,
        error: onvoResult.error || onvoResult,
        message: onvoResult.message,
        fullResponse: onvoResult
      });
      
      // Log the raw response for debugging
      const errorText = await onvoResponse.text();
      console.error('❌ Raw OnvoPay response:', errorText);
      
      throw new Error(`OnvoPay API error (${onvoResponse.status}): ${onvoResult.error?.message || onvoResult.message || onvoResponse.statusText || 'Unknown error'}`);
    }

    // Determine status based on OnvoPay response
    const status = onvoResult.status === 'succeeded' ? 'captured' : 'pending_authorization';
    const now = new Date().toISOString();
    const authorizedAt = (status === 'captured' || status === 'authorized') ? now : null;
    const capturedAt = status === 'captured' ? now : null;

    console.log('💾 Creating payment record with OnvoPay data...');

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

  } catch (error) {
    console.error('❌ Function error:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 300)
    });

    return new Response(JSON.stringify({
      error: error.message || 'Function error',
      success: false,
      timestamp: new Date().toISOString(),
      debug: {
        error_type: error.name,
        has_stack: !!error.stack
      }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});