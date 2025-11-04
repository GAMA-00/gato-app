import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeo de eventos de OnvoPay Loops y eventos legacy
const LOOP_EVENTS: Record<string, string> = {
  'loop.charge.succeeded': 'charge_succeeded',
  'loop.charge.failed': 'charge_failed',
  'loop.cancelled': 'subscription_cancelled',
  'loop.paused': 'subscription_paused',
  'loop.resumed': 'subscription_resumed',
  // Eventos legacy (mantener por compatibilidad)
  'invoice.payment_succeeded': 'charge_succeeded',
  'subscription.charge.succeeded': 'charge_succeeded',
  'charge.succeeded': 'charge_succeeded'
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
    
    console.log('📥 [onvopay-subscription-webhook] Received webhook:', {
      type: webhookPayload.type,
      data: webhookPayload.data
    });

    const eventType = webhookPayload.type;
    const normalizedEvent = LOOP_EVENTS[eventType];

    if (!normalizedEvent) {
      console.log('⚠️ Unknown event type:', eventType);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Extract Loop/Subscription ID (priorizar loop_id sobre subscription_id)
    const loopId = webhookPayload.data?.loop_id || 
                   webhookPayload.data?.subscription_id ||
                   webhookPayload.data?.id;

    console.log('🔍 Searching for subscription with loop_id or subscription_id:', loopId);

    // Handle successful charges (Loop o Legacy)
    if (normalizedEvent === 'charge_succeeded') {
      const chargeAmount = webhookPayload.data?.amount_paid || 
                          webhookPayload.data?.amount || 
                          0;
      
      const onvopayInvoiceId = webhookPayload.data?.invoice_id || 
                              webhookPayload.data?.invoice || 
                              null;

      const chargeId = webhookPayload.data?.charge_id || 
                      webhookPayload.data?.charge || 
                      webhookPayload.data?.id ||
                      null;

      const nextChargeAt = webhookPayload.data?.next_charge_at || null;

      console.log('💳 Processing charge:', { loopId, chargeId, chargeAmount, nextChargeAt });

      // Find subscription by loop_id (prioridad) o onvopay_subscription_id (legacy)
      const { data: subscription, error: subError } = await supabase
        .from('onvopay_subscriptions')
        .select('*')
        .or(`onvopay_loop_id.eq.${loopId},onvopay_subscription_id.eq.${loopId}`)
        .single();

      if (subError || !subscription) {
        console.error('❌ Subscription not found for loop/subscription ID:', loopId, subError);
        return new Response(
          JSON.stringify({ 
            received: true, 
            error: 'Subscription not found' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      console.log('✅ Subscription found:', {
        id: subscription.id,
        client_id: subscription.client_id,
        loop_status: subscription.loop_status
      });

      // Check if payment already recorded
      const { data: existingPayment } = await supabase
        .from('onvopay_payments')
        .select('id')
        .eq('onvopay_payment_id', chargeId)
        .single();

      if (existingPayment) {
        console.log('⚠️ Payment already recorded, skipping:', chargeId);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Insert payment record
      const { error: paymentError } = await supabase
        .from('onvopay_payments')
        .insert({
          appointment_id: subscription.external_reference,
          client_id: subscription.client_id,
          provider_id: subscription.provider_id,
          amount: chargeAmount / 100,
          payment_type: subscription.loop_status === 'active' ? 'recurring_charge' : 'recurring_charge_legacy',
          status: 'captured',
          onvopay_invoice_id: onvopayInvoiceId,
          onvopay_transaction_id: chargeId,
          payment_method: 'card',
          authorized_at: new Date().toISOString(),
          captured_at: new Date().toISOString(),
          onvopay_response: webhookPayload.data
        });

      if (paymentError) {
        console.error('❌ Error creating payment record:', paymentError);
      } else {
        console.log('✅ Payment record created successfully');
      }

      // Update subscription's next charge date and last charge date
      const updateData: any = {
        last_charge_date: new Date().toISOString(),
        failed_attempts: 0 // Reset failed attempts on success
      };

      if (nextChargeAt) {
        updateData.next_charge_date = nextChargeAt.split('T')[0];
      }

      await supabase
        .from('onvopay_subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      console.log('✅ Subscription updated with charge dates');
    }

    // Handle failed charges
    if (normalizedEvent === 'charge_failed') {
      console.log('❌ Processing failed charge for loop:', loopId);

      const { data: subscription } = await supabase
        .from('onvopay_subscriptions')
        .select('*')
        .or(`onvopay_loop_id.eq.${loopId},onvopay_subscription_id.eq.${loopId}`)
        .single();

      if (subscription) {
        const newFailedAttempts = (subscription.failed_attempts || 0) + 1;
        const shouldCancel = newFailedAttempts >= 3;

        await supabase
          .from('onvopay_subscriptions')
          .update({
            failed_attempts: newFailedAttempts,
            status: shouldCancel ? 'cancelled' : subscription.status,
            loop_status: shouldCancel ? 'cancelled' : subscription.loop_status
          })
          .eq('id', subscription.id);

        console.log(`⚠️ Failed attempt ${newFailedAttempts}/3 for subscription ${subscription.id}`);

        if (shouldCancel) {
          console.log('🚫 Subscription cancelled after 3 failed attempts');
          
          // Cancel future appointments
          await supabase
            .from('appointments')
            .update({ 
              status: 'cancelled',
              cancellation_reason: 'Subscription cancelled: payment failures'
            })
            .eq('client_id', subscription.client_id)
            .eq('provider_id', subscription.provider_id)
            .gt('start_time', new Date().toISOString());
        }
      }
    }

    // Handle subscription cancellation
    if (normalizedEvent === 'subscription_cancelled') {
      console.log('🚫 Processing subscription cancellation for loop:', loopId);

      const { data: subscription } = await supabase
        .from('onvopay_subscriptions')
        .select('*')
        .or(`onvopay_loop_id.eq.${loopId},onvopay_subscription_id.eq.${loopId}`)
        .single();

      if (subscription) {
        await supabase
          .from('onvopay_subscriptions')
          .update({
            status: 'cancelled',
            loop_status: 'cancelled'
          })
          .eq('id', subscription.id);

        // Cancel future appointments
        await supabase
          .from('appointments')
          .update({ 
            status: 'cancelled',
            cancellation_reason: 'Subscription cancelled by OnvoPay'
          })
          .eq('client_id', subscription.client_id)
          .eq('provider_id', subscription.provider_id)
          .gt('start_time', new Date().toISOString());

        console.log('✅ Subscription and future appointments cancelled');
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
