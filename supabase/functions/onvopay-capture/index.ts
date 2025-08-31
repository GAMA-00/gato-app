import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const onvopayApiKey = Deno.env.get('ONVOPAY_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { paymentId } = await req.json();

    console.log('Onvopay Capture Request:', { paymentId });

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('onvopay_payments')
      .select('*, appointments(provider_id, status)')
      .eq('id', paymentId)
      .eq('status', 'authorized')
      .single();

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

    // Call Onvopay capture API
    const onvopayResponse = await fetch(`https://api.onvopay.com/v1/payments/${payment.onvopay_payment_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${onvopayApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: payment.amount // Capture full amount
      })
    });

    const onvopayResult = await onvopayResponse.json();

    console.log('Onvopay Capture Response:', onvopayResult);

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

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment.id,
      amount_captured: payment.amount,
      onvopay_capture_id: onvopayResult.id,
      message: 'Pago capturado exitosamente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in onvopay-capture:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});