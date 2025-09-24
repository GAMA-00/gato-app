import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const webhookData = await req.json();
    
    console.log('Onvopay Webhook Received:', webhookData);

    const {
      id: onvopay_event_id,
      type: event_type,
      data: eventData
    } = webhookData;

    // Check for duplicate events
    const { data: existingWebhook } = await supabaseAdmin
      .from('onvopay_webhooks')
      .select('id')
      .eq('onvopay_event_id', onvopay_event_id)
      .single();

    let is_duplicate = false;
    if (existingWebhook) {
      is_duplicate = true;
      console.log('Duplicate webhook detected:', onvopay_event_id);
    }

    // Always log the webhook
    const { data: webhook, error: webhookError } = await supabaseAdmin
      .from('onvopay_webhooks')
      .insert({
        onvopay_event_id,
        event_type,
        webhook_data: webhookData,
        is_duplicate,
        is_unexpected_event: false,
        processed: false
      })
      .select()
      .single();

    if (webhookError) {
      console.error('Error logging webhook:', webhookError);
    }

    // Skip processing if duplicate
    if (is_duplicate) {
      return new Response(JSON.stringify({ 
        received: true, 
        duplicate: true,
        message: 'Webhook duplicado, ignorado'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processedSuccessfully = false;
    let processingResult = {};
    let errorDetails = {};

    try {
      // Process different event types
      switch (event_type) {
        case 'payment.authorized':
        case 'payment.succeeded':
          await handlePaymentAuthorized(supabaseAdmin, eventData);
          processedSuccessfully = true;
          processingResult = { status: 'payment_authorized' };
          break;

        case 'payment.captured':
          await handlePaymentCaptured(supabaseAdmin, eventData);
          processedSuccessfully = true;
          processingResult = { status: 'payment_captured' };
          break;

        case 'payment.failed':
          await handlePaymentFailed(supabaseAdmin, eventData);
          processedSuccessfully = true;
          processingResult = { status: 'payment_failed' };
          break;

        case 'subscription.charged':
          await handleSubscriptionCharged(supabaseAdmin, eventData);
          processedSuccessfully = true;
          processingResult = { status: 'subscription_charged' };
          break;

        case 'subscription.failed':
          await handleSubscriptionFailed(supabaseAdmin, eventData);
          processedSuccessfully = true;
          processingResult = { status: 'subscription_failed' };
          break;

        default:
          console.log('Unexpected event type:', event_type);
          // Mark as unexpected but don't fail
          await supabaseAdmin
            .from('onvopay_webhooks')
            .update({
              is_unexpected_event: true,
              processed: false,
              processing_result: { message: 'Evento no manejado' }
            })
            .eq('id', webhook?.id);

          return new Response(JSON.stringify({ 
            received: true,
            processed: false,
            message: 'Tipo de evento no manejado, requiere revisión manual'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }

    } catch (processingError: any) {
      console.error('Error processing webhook:', processingError);
      errorDetails = { 
        error: processingError?.message || 'Unknown error',
        stack: processingError?.stack || 'No stack trace'
      };
    }

    // Update webhook processing status
    if (webhook?.id) {
      await supabaseAdmin
        .from('onvopay_webhooks')
        .update({
          processed: processedSuccessfully,
          processed_at: processedSuccessfully ? new Date().toISOString() : null,
          processing_result: processingResult,
          error_details: errorDetails,
          retry_count: (webhook.retry_count || 0) + 1
        })
        .eq('id', webhook.id);
    }

    return new Response(JSON.stringify({ 
      received: true,
      processed: processedSuccessfully,
      event_type,
      message: processedSuccessfully ? 'Webhook procesado exitosamente' : 'Error procesando webhook'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in onvopay-webhook:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      received: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions for processing different webhook events

async function handlePaymentAuthorized(supabaseAdmin: any, eventData: any) {
  const { payment_id, reference } = eventData;
  
  const { error } = await supabaseAdmin
    .from('onvopay_payments')
    .update({
      status: 'authorized',
      authorized_at: new Date().toISOString(),
      onvopay_response: { ...{}, webhook_data: eventData }
    })
    .eq('onvopay_payment_id', payment_id);

  if (error) {
    throw new Error(`Error updating payment authorization: ${error.message}`);
  }

  console.log('Payment authorized:', payment_id);
}

async function handlePaymentCaptured(supabaseAdmin: any, eventData: any) {
  const { payment_id, amount } = eventData;
  
  const { error } = await supabaseAdmin
    .from('onvopay_payments')
    .update({
      status: 'captured',
      captured_at: new Date().toISOString(),
      onvopay_response: { ...{}, webhook_capture: eventData }
    })
    .eq('onvopay_payment_id', payment_id);

  if (error) {
    throw new Error(`Error updating payment capture: ${error.message}`);
  }

  console.log('Payment captured:', payment_id, 'Amount:', amount);
}

async function handlePaymentFailed(supabaseAdmin: any, eventData: any) {
  const { payment_id, error_code, error_message } = eventData;
  
  const { error } = await supabaseAdmin
    .from('onvopay_payments')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      error_details: { code: error_code, message: error_message, webhook_data: eventData }
    })
    .eq('onvopay_payment_id', payment_id);

  if (error) {
    throw new Error(`Error updating payment failure: ${error.message}`);
  }

  console.log('Payment failed:', payment_id, 'Error:', error_message);
}

async function handleSubscriptionCharged(supabaseAdmin: any, eventData: any) {
  const { subscription_id, payment_id, amount, reference } = eventData;
  
  // Find the subscription
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('onvopay_subscriptions')
    .select('*')
    .eq('onvopay_subscription_id', subscription_id)
    .single();

  if (subError || !subscription) {
    throw new Error(`Subscription not found: ${subscription_id}`);
  }

  // Create new appointment based on template
  if (subscription.inherit_original_data && subscription.original_appointment_template) {
    const template = subscription.original_appointment_template;
    
    // Calculate next appointment date/time based on interval
    const nextDate = new Date();
    if (subscription.interval_type === 'weekly') {
      nextDate.setDate(nextDate.getDate() + (7 * subscription.interval_count));
    } else if (subscription.interval_type === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + subscription.interval_count);
    }

    // Create new appointment
    const { error: aptError } = await supabaseAdmin
      .from('appointments')
      .insert({
        provider_id: subscription.provider_id,
        client_id: subscription.client_id,
        listing_id: template.listing_id,
        residencia_id: template.residencia_id,
        start_time: nextDate.toISOString(),
        end_time: new Date(nextDate.getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
        status: 'pending',
        client_name: template.client_name,
        client_email: template.client_email,
        client_phone: template.client_phone,
        client_address: template.client_address,
        notes: template.notes,
        recurrence: subscription.interval_type,
        external_booking: false,
        is_recurring_instance: true
      });

    if (aptError) {
      console.error('Error creating recurring appointment:', aptError);
    }
  }

  // Update subscription
  const nextChargeDate = new Date();
  if (subscription.interval_type === 'weekly') {
    nextChargeDate.setDate(nextChargeDate.getDate() + (7 * subscription.interval_count));
  } else if (subscription.interval_type === 'monthly') {
    nextChargeDate.setMonth(nextChargeDate.getMonth() + subscription.interval_count);
  }

  const { error: updateError } = await supabaseAdmin
    .from('onvopay_subscriptions')
    .update({
      last_charge_date: new Date().toISOString().split('T')[0],
      next_charge_date: nextChargeDate.toISOString().split('T')[0],
      failed_attempts: 0 // Reset failed attempts on successful charge
    })
    .eq('id', subscription.id);

  if (updateError) {
    throw new Error(`Error updating subscription: ${updateError.message}`);
  }

  console.log('Subscription charged successfully:', subscription_id);
}

async function handleSubscriptionFailed(supabaseAdmin: any, eventData: any) {
  const { subscription_id, error_code, error_message } = eventData;
  
  // Update subscription with failure
  const { error } = await supabaseAdmin
    .from('onvopay_subscriptions')
    .update({
      failed_attempts: supabaseAdmin.raw('failed_attempts + 1'),
      last_failure_reason: error_message,
      status: supabaseAdmin.raw(`CASE 
        WHEN failed_attempts + 1 >= max_retry_attempts THEN 'cancelled' 
        ELSE status 
      END`)
    })
    .eq('onvopay_subscription_id', subscription_id);

  if (error) {
    throw new Error(`Error updating subscription failure: ${error.message}`);
  }

  console.log('Subscription charge failed:', subscription_id, 'Error:', error_message);
}