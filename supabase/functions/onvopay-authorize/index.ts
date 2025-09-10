import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 ONVOPAY AUTHORIZE - Function started');

  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight handled');
      return new Response(null, { headers: corsHeaders });
    }

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
      appointmentId: body.appointmentId
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

    // Determine status and timestamps
    const status = body.payment_type === 'cash' ? 'authorized' : 'captured';
    const now = new Date().toISOString();
    const authorizedAt = status === 'authorized' ? now : null;
    const capturedAt = status === 'captured' ? now : null;

    console.log('💾 Creating payment record...');

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
        card_info: body.card_info || {},
        authorized_at: authorizedAt,
        captured_at: capturedAt,
        onvopay_payment_id: `mock_onvo_${Date.now()}`,
        onvopay_transaction_id: `txn_${Date.now()}`,
        external_reference: body.appointmentId,
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('❌ Payment creation failed:', paymentError);
      throw new Error('Failed to create payment record');
    }

    console.log('✅ Payment record created:', payment.id);

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
      amount: body.amount,
      currency: 'USD',
      message: body.payment_type === 'cash'
        ? 'Pago autorizado. Se cobrará al completar el servicio.'
        : 'Pago procesado exitosamente.',
      timestamp: now
    };

    console.log('✅ Returning success response with payment ID:', payment.id);

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