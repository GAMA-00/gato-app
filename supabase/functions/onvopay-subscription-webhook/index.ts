import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookPayload = await req.json();
    const eventType = webhookPayload.type;

    console.log('📨 Webhook received:', eventType, webhookPayload);

    // Handle subscription payment success
    if (eventType === 'invoice.payment_succeeded' || 
        eventType === 'subscription.charge.succeeded' ||
        eventType === 'charge.succeeded') {
      
      const subscriptionId = webhookPayload.data?.subscription_id || webhookPayload.data?.subscription;
      const chargeAmount = webhookPayload.data?.amount_paid || webhookPayload.data?.amount;
      const onvopayInvoiceId = webhookPayload.data?.id;
      const chargeId = webhookPayload.data?.charge_id || webhookPayload.data?.id;

      if (!subscriptionId) {
        console.log('⚠️ No subscription_id in webhook, skipping');
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get subscription details
      const { data: subscription, error: subError } = await supabase
        .from('onvopay_subscriptions')
        .select('*, appointments:external_reference(*)')
        .eq('onvopay_subscription_id', subscriptionId)
        .single();

      if (subError || !subscription) {
        console.error('❌ Subscription not found:', subscriptionId, subError);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if payment already recorded
      const { data: existingPayment } = await supabase
        .from('onvopay_payments')
        .select('id')
        .eq('onvopay_payment_id', onvopayInvoiceId)
        .single();

      if (existingPayment) {
        console.log('⚠️ Payment already recorded, skipping:', onvopayInvoiceId);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create payment record for this recurring charge
      const { error: paymentError } = await supabase
        .from('onvopay_payments')
        .insert({
          appointment_id: subscription.external_reference,
          client_id: subscription.client_id,
          provider_id: subscription.provider_id,
          onvopay_payment_id: onvopayInvoiceId,
          onvopay_transaction_id: chargeId,
          amount: chargeAmount,
          subtotal: chargeAmount,
          iva_amount: 0,
          payment_type: 'recurring',
          payment_method: 'card',
          status: 'captured',
          onvopay_response: webhookPayload.data,
          authorized_at: new Date().toISOString(),
          captured_at: new Date().toISOString()
        });

      if (paymentError) {
        console.error('❌ Error creating payment record:', paymentError);
      } else {
        console.log('✅ Recurring payment recorded');
      }

      // Update subscription next_charge_date
      const nextChargeDate = webhookPayload.data?.next_payment_date;
      if (nextChargeDate) {
        await supabase
          .from('onvopay_subscriptions')
          .update({ next_charge_date: nextChargeDate })
          .eq('id', subscription.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    // Always return 200 to avoid webhook retries
    return new Response(JSON.stringify({ received: true, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
