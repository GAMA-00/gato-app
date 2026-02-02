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

    // Get invoice with appointment and client details including currency
    const { data: invoice, error: invoiceError } = await supabase
      .from('post_payment_invoices')
      .select(`
        *,
        appointments!inner(
          id,
          client_id,
          provider_id,
          listing_id,
          listings!inner(title, currency)
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Fetch client name with robust fallback
    let clientName = 'Cliente';
    try {
      const { data: clientProfile } = await supabase
        .from('users')
        .select('name')
        .eq('id', invoice.appointments.client_id)
        .maybeSingle();

      clientName = clientProfile?.name?.trim() || 'Cliente';
      console.log('👤 T2 Client profile name:', clientProfile?.name || '(none)');
    } catch (e) {
      console.warn('⚠️ Could not fetch T2 client profile name', e);
    }
    console.log('👤 T2 Final client name:', clientName);

    // Get client's saved payment method from payment_methods table (not onvopay_payments)
    console.log('🔍 Getting payment method for client:', invoice.appointments.client_id);
    const { data: savedMethod } = await supabase
      .from('payment_methods')
      .select('onvopay_payment_method_id')
      .eq('user_id', invoice.appointments.client_id)
      .not('onvopay_payment_method_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!savedMethod?.onvopay_payment_method_id) {
      throw new Error('No saved payment method found for client');
    }

    console.log('✅ Payment method found:', savedMethod.onvopay_payment_method_id);

    // Obtener el total de gastos adicionales desde los items de la factura
    const { data: items, error: itemsError } = await supabase
      .from('post_payment_items')
      .select('amount')
      .eq('invoice_id', invoiceId);

    if (itemsError) {
      console.error('❌ Error fetching invoice items:', itemsError);
      throw new Error('Failed to fetch invoice items');
    }

    const itemsTotal = (items || []).reduce((sum: number, i: any) => sum + (i?.amount || 0), 0);

    // Si no hay gastos adicionales, omitir el cobro (flujo válido)
    if (!itemsTotal || itemsTotal <= 0) {
      console.log('ℹ️ [FLOW] No additional expenses to charge. Skipping T2 payment.');
      return new Response(JSON.stringify({
        success: true,
        status: 'skipped',
        amount: 0,
        message: 'No additional expenses to charge'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const amountCents = Math.round(itemsTotal * 100);

    // Fetch customer ID if exists
    const { data: customerMapping } = await supabase
      .from('onvopay_customers')
      .select('onvopay_customer_id')
      .eq('client_id', invoice.appointments.client_id)
      .maybeSingle();

    const customerId = customerMapping?.onvopay_customer_id;

    // Get currency from listing
    const currency = invoice.appointments.listings?.currency || 'USD';
    console.log('💱 Currency for post-payment:', currency);

    // ✅ PASO 1: Crear Payment Intent SIN payment_method (OnvoPay requiere 3 pasos para saved methods)
    const paymentIntentPayload = {
      amount: amountCents,
      currency: currency,  // ✅ Dynamic currency from listing
      description: `Gastos adicionales - ${invoice.appointments.listings.title}`,
      metadata: {
        invoice_id: invoiceId,
        appointment_id: invoice.appointment_id,
        client_id: invoice.appointments.client_id,
        provider_id: invoice.appointments.provider_id,
        payment_phase: 'T2_POST_PAYMENT',
        customer_name: clientName,
        ...(customerId && { onvopay_customer_id: customerId })
      }
    };

    console.log('👤 Using customer ID for post-payment:', customerId || 'none');
    console.log('👤 T2 Customer name (final):', clientName);

    console.log('🔐 [FLOW] Step 1: Creating T2 Payment Intent (amount:', amountCents, 'cents)');

    const createResponse = await fetch(`${config.fullUrl}/payment-intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentIntentPayload)
    });

    const paymentIntent = await createResponse.json();

    if (!createResponse.ok) {
      console.error('❌ Step 1 failed - Payment Intent creation error:', paymentIntent);
      throw new Error(paymentIntent.message || 'Failed to create Payment Intent');
    }

    console.log('✅ [FLOW] Step 1 complete - Payment Intent created:', paymentIntent.id);

    // ✅ PASO 2: Confirmar con el payment_method_id guardado
    console.log('💳 [FLOW] Step 2: Confirming with saved payment method:', savedMethod.onvopay_payment_method_id);

    const confirmResponse = await fetch(
      `${config.fullUrl}/payment-intents/${paymentIntent.id}/confirm`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: savedMethod.onvopay_payment_method_id
        })
      }
    );

    const confirmedPayment = await confirmResponse.json();

    if (!confirmResponse.ok) {
      console.error('❌ Step 2 failed - Payment confirmation error:', confirmedPayment);
      throw new Error(confirmedPayment.message || 'Failed to confirm payment');
    }

    console.log('✅ [FLOW] Step 2 complete - Payment confirmed with status:', confirmedPayment.status);

    // ✅ PASO 3: Capturar si está en estado 'requires_capture'
    let finalPayment = confirmedPayment;
    
    if (confirmedPayment.status === 'requires_capture') {
      console.log('💰 [FLOW] Step 3: Capturing payment...');
      
      const captureResponse = await fetch(
        `${config.fullUrl}/payment-intents/${paymentIntent.id}/capture`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
          }
        }
      );

      finalPayment = await captureResponse.json();

      if (!captureResponse.ok) {
        console.error('❌ Step 3 failed - Payment capture error:', finalPayment);
        throw new Error(finalPayment.message || 'Failed to capture payment');
      }

      console.log('✅ [FLOW] Step 3 complete - Payment captured with status:', finalPayment.status);
    } else {
      console.log('⏭️ [FLOW] Step 3 skipped - Payment already in final state:', confirmedPayment.status);
    }

    const onvoResult = finalPayment;

    // Determinar el estado final basado en el resultado de OnvoPay
    const finalStatus = onvoResult.status === 'succeeded' ? 'captured' : 
                       onvoResult.status === 'requires_capture' ? 'authorized' : 
                       'pending_authorization';

    // Guardar registro de pago en BD
    console.log('💾 [FLOW] Saving T2 payment record to DB with status:', finalStatus);
    // Note: Using 'cash' for T2 post-payment charges as the DB constraint 
    // only allows 'cash' (one-time) or 'subscription' (recurring).
    // Post-payments are one-time additional charges, so 'cash' is appropriate.
    const { data: payment, error: paymentError } = await supabase
      .from('onvopay_payments')
      .insert({
        appointment_id: invoice.appointment_id,
        client_id: invoice.appointments.client_id,
        provider_id: invoice.appointments.provider_id,
        onvopay_payment_id: onvoResult.id,
        amount: amountCents,
        subtotal: amountCents,
        iva_amount: 0,
        currency: currency,  // ✅ Dynamic currency from listing
        payment_type: 'cash',
        payment_method: 'card',
        status: finalStatus,
        onvopay_response: onvoResult,
        authorized_at: new Date().toISOString(),
        captured_at: onvoResult.status === 'succeeded' ? new Date().toISOString() : null,
        card_info: {
          payment_method_id: savedMethod.onvopay_payment_method_id
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Error saving payment to DB:', paymentError);
      throw paymentError;
    }

    console.log('✅ [FLOW] T2 payment flow complete - Payment ID:', payment.id, '| Status:', payment.status);

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
