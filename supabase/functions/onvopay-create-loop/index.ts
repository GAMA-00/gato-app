/**
 * OnvoPay Create Loop
 * 
 * Crea un "Loop" (cargo recurrente automático) en OnvoPay después de capturar
 * el primer pago exitosamente. OnvoPay gestionará los cobros futuros automáticamente.
 * 
 * Flow: Initial Payment Captured → Create Loop → OnvoPay handles future charges
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');
const ONVOPAY_API_URL = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com';

// Mapeo de tipos de recurrencia a formato OnvoPay Loops
const INTERVAL_MAP: Record<string, { interval: string; interval_count: number }> = {
  'weekly': { interval: 'week', interval_count: 1 },
  'biweekly': { interval: 'week', interval_count: 2 },
  'triweekly': { interval: 'week', interval_count: 3 },
  'monthly': { interval: 'month', interval_count: 1 }
};

interface CreateLoopRequest {
  subscription_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ❌ OnvoPay does not support /v1/loops endpoint
  console.error('❌ [onvopay-create-loop] DEPRECATED: OnvoPay /v1/loops endpoint not supported');
  
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: "Cannot POST /v1/loops",
      details: "OnvoPay does not support /v1/loops endpoint. Use manual recurring payments instead.",
      deprecated: true,
      recommendation: "Use onvopay-initiate-recurring for manual recurring payments"
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 410, // Gone - endpoint no longer available
    }
  );

  // Original code commented out for reference
  /*
  try {
    const { subscription_id }: CreateLoopRequest = await req.json();

    console.log('🔄 [onvopay-create-loop] Creating OnvoPay Loop for subscription:', subscription_id);

    if (!subscription_id) {
      throw new Error('subscription_id is required');
    }

    if (!ONVOPAY_SECRET_KEY) {
      throw new Error('ONVOPAY_SECRET_KEY not configured');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Get subscription details
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('onvopay_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) {
      throw new Error(`Subscription not found: ${subscription_id}`);
    }

    console.log('📋 Subscription fetched:', {
      id: subscription.id,
      client_id: subscription.client_id,
      interval_type: subscription.interval_type,
      amount: subscription.amount,
      payment_method_id: subscription.payment_method_id,
    });

    // 2. Get OnvoPay customer ID
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('onvopay_customers')
      .select('onvopay_customer_id')
      .eq('client_id', subscription.client_id)
      .single();

    if (customerError || !customer) {
      throw new Error(`OnvoPay customer not found for client: ${subscription.client_id}`);
    }

    console.log('👤 OnvoPay customer found:', customer.onvopay_customer_id);

    // 3. Map recurrence to OnvoPay interval format
    const intervalConfig = INTERVAL_MAP[subscription.interval_type];
    
    if (!intervalConfig) {
      throw new Error(`Unsupported interval_type: ${subscription.interval_type}`);
    }

    console.log('📅 Interval configuration:', intervalConfig);

    // 4. Build Loop description
    const recurrenceLabel = subscription.interval_type === 'weekly' 
      ? 'Semanal' 
      : subscription.interval_type === 'biweekly' 
      ? 'Quincenal'
      : subscription.interval_type === 'triweekly'
      ? 'Cada 3 semanas'
      : 'Mensual';

    const description = `Servicio Recurrente - ${recurrenceLabel}`;

    // 5. Create Loop in OnvoPay
    const idempotencyKey = `loop-${subscription_id}`;
    const loopUrl = `${ONVOPAY_API_URL}/v1/loops`;

    console.log('📡 Creating Loop in OnvoPay:', {
      url: loopUrl,
      customer_id: customer.onvopay_customer_id,
      payment_method_id: subscription.payment_method_id,
      amount: subscription.amount,
      interval: intervalConfig.interval,
      interval_count: intervalConfig.interval_count,
    });

    const loopResponse = await fetch(loopUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        customer_id: customer.onvopay_customer_id,
        payment_method_id: subscription.payment_method_id,
        amount: Math.round(subscription.amount * 100), // Convert to cents
        currency: 'USD',
        interval: intervalConfig.interval,
        interval_count: intervalConfig.interval_count,
        description: description,
        charge_immediately: true, // 🔥 CRÍTICO: Cobrar primer pago al crear Loop
        billing_cycle_anchor: subscription.start_date || new Date().toISOString(),
        metadata: {
          subscription_id: subscription.id,
          recurring_rule_id: subscription.recurring_rule_id,
          appointment_id: subscription.external_reference,
          app: 'gato-app',
          tz: 'America/Costa_Rica',
        },
      }),
    });

    const loopText = await loopResponse.text();
    let loopData: any;

    try {
      loopData = JSON.parse(loopText);
    } catch (e) {
      console.error('❌ Error parsing OnvoPay Loop response:', loopText.substring(0, 200));
      throw new Error('Invalid JSON response from OnvoPay');
    }

    if (!loopResponse.ok) {
      console.error('❌ OnvoPay Loop creation failed:', loopData);
      throw new Error(loopData.message || 'OnvoPay Loop creation failed');
    }

    console.log('✅ OnvoPay Loop created successfully:', {
      loop_id: loopData.id,
      status: loopData.status,
      next_charge_at: loopData.next_charge_at,
      initial_charge: loopData.initial_charge,
    });

    // 6. Handle initial charge if present
    let initialPaymentId = null;
    if (loopData.initial_charge) {
      console.log('💳 Loop includes initial charge:', loopData.initial_charge);

      const { data: paymentRecord, error: paymentError } = await supabaseAdmin
        .from('onvopay_payments')
        .insert({
          appointment_id: subscription.external_reference,
          client_id: subscription.client_id,
          provider_id: subscription.provider_id,
          amount: subscription.amount,
          payment_type: 'recurring_initial',
          status: loopData.initial_charge.status || 'captured',
          onvopay_payment_id: loopData.initial_charge.id,
          onvopay_transaction_id: loopData.initial_charge.charge_id || loopData.initial_charge.id,
          payment_method: 'card',
          authorized_at: new Date().toISOString(),
          captured_at: loopData.initial_charge.captured_at || new Date().toISOString(),
          onvopay_response: loopData.initial_charge
        })
        .select()
        .single();

      if (paymentError) {
        console.error('⚠️ Error creating initial payment record:', paymentError);
      } else {
        initialPaymentId = paymentRecord?.id;
        console.log('✅ Initial payment record created:', initialPaymentId);
      }
    }

    // 7. Update subscription with Loop details
    const { error: updateError } = await supabaseAdmin
      .from('onvopay_subscriptions')
      .update({
        onvopay_loop_id: loopData.id,
        loop_status: 'active',
        loop_metadata: loopData,
        initial_charge_date: loopData.initial_charge ? new Date().toISOString() : null,
        last_charge_date: loopData.initial_charge ? new Date().toISOString() : null,
        next_charge_date: loopData.next_charge_at?.split('T')[0] || subscription.next_charge_date,
      })
      .eq('id', subscription_id);

    if (updateError) {
      console.error('⚠️ Error updating subscription with Loop ID:', updateError);
      // Don't throw - Loop was created successfully in OnvoPay
    }

    // 8. Update appointment with payment and loop info
    if (subscription.external_reference && initialPaymentId) {
      await supabaseAdmin
        .from('appointments')
        .update({
          onvopay_payment_id: initialPaymentId,
          onvopay_subscription_id: subscription_id,
          status: 'confirmed' // Loop cobró exitosamente
        })
        .eq('id', subscription.external_reference);

      console.log('✅ Appointment updated with payment and subscription info');
    }

    return new Response(
      JSON.stringify({
        success: true,
        loop_id: loopData.id,
        loop_status: loopData.status,
        next_charge_at: loopData.next_charge_at,
        subscription_id: subscription_id,
        initial_payment_id: initialPaymentId,
        initial_charge_captured: !!loopData.initial_charge,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ [onvopay-create-loop] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
