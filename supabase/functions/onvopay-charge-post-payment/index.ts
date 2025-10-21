import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getOnvoConfig() {
  const baseUrl = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com';
  const version = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  
  return {
    baseUrl,
    version,
    fullUrl: `${baseUrl}/${version}`
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config = getOnvoConfig();
    const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');
    
    if (!ONVOPAY_SECRET_KEY) {
      throw new Error('ONVOPAY_SECRET_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { invoiceId } = await req.json();

    console.log('💵 Processing T2 post-payment charge:', { invoiceId });

    // Get invoice with appointment and client details
    const { data: invoice, error: invoiceError } = await supabase
      .from('post_payment_invoices')
      .select(`
        *,
        appointments!inner(
          id,
          client_id,
          provider_id,
          listing_id,
          listings!inner(title)
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Get client's saved payment method (from previous T1 transaction)
    const { data: previousPayment } = await supabase
      .from('onvopay_payments')
      .select('onvopay_payment_method_id')
      .eq('appointment_id', invoice.appointment_id)
      .not('onvopay_payment_method_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!previousPayment?.onvopay_payment_method_id) {
      throw new Error('No saved payment method found for client');
    }

    const amountCents = Math.round(invoice.total_price * 100);

    // Create Payment Intent for T2
    const paymentIntentPayload = {
      amount: amountCents,
      currency: 'USD',
      description: `Gastos adicionales - ${invoice.appointments.listings.title}`,
      payment_method: previousPayment.onvopay_payment_method_id,
      confirm: true,
      capture_method: 'automatic',
      metadata: {
        invoice_id: invoiceId,
        appointment_id: invoice.appointment_id,
        client_id: invoice.appointments.client_id,
        provider_id: invoice.appointments.provider_id,
        payment_phase: 'T2_POST_PAYMENT'
      }
    };

    console.log('📤 Creating T2 Payment Intent...');

    const onvoResponse = await fetch(`${config.fullUrl}/payment-intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentIntentPayload)
    });

    const onvoResult = await onvoResponse.json();

    if (!onvoResponse.ok) {
      console.error('❌ OnvoPay error:', onvoResult);
      throw new Error(onvoResult.message || 'Payment failed');
    }

    console.log('✅ T2 Payment Intent created:', onvoResult.id);

    // Create payment record in DB
    const { data: payment, error: paymentError } = await supabase
      .from('onvopay_payments')
      .insert({
        appointment_id: invoice.appointment_id,
        client_id: invoice.appointments.client_id,
        provider_id: invoice.appointments.provider_id,
        listing_id: invoice.appointments.listing_id,
        onvopay_payment_id: onvoResult.id,
        amount: amountCents,
        subtotal: amountCents,
        iva_amount: 0,
        payment_type: 'postpaid',
        payment_method: 'card',
        status: onvoResult.status === 'succeeded' ? 'captured' : 'authorized',
        onvopay_response: onvoResult,
        authorized_at: new Date().toISOString(),
        captured_at: onvoResult.status === 'succeeded' ? new Date().toISOString() : null,
        onvopay_payment_method_id: previousPayment.onvopay_payment_method_id
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Error saving payment:', paymentError);
      throw paymentError;
    }

    console.log('✅ T2 payment saved:', payment.id);

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment.id,
      onvopay_payment_id: onvoResult.id,
      amount: amountCents,
      status: payment.status,
      message: 'T2 post-payment charged successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error in T2 charge:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
