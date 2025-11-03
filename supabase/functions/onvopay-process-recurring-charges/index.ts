/**
 * OnvoPay Process Recurring Charges
 * 
 * NEW FLOW (Post-Refactor):
 * This function now handles ONLY future recurring charges after the initial charge.
 * The initial charge is handled by the regular authorize → capture flow when provider accepts.
 * 
 * This scheduler runs periodically to:
 * 1. Find subscriptions with next_charge_date <= today
 * 2. Create Payment Intent using saved payment_method_id
 * 3. Confirm and capture the charge immediately
 * 4. Update next_charge_date for the next occurrence
 * 5. Create next appointment instance if needed
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionToProcess {
  id: string;
  client_id: string;
  provider_id: string;
  amount: number;
  interval_type: string;
  interval_count: number;
  payment_method_id: string;
  next_charge_date: string;
  failed_attempts: number;
  max_retry_attempts: number;
  external_reference: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const onvoSecretKey = Deno.env.get('ONVOPAY_SECRET_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Processing recurring charges...');
    console.log(`📅 Current date: ${new Date().toISOString()}`);

    // Find subscriptions that need to be charged today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: subscriptions, error: fetchError } = await supabase
      .from('onvopay_subscriptions')
      .select('*')
      .eq('status', 'active')
      .eq('loop_status', 'manual_scheduling')
      .not('payment_method_id', 'is', null)
      .lte('next_charge_date', today)
      .order('next_charge_date', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('✅ No subscriptions to process today');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No charges due today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${subscriptions.length} subscriptions to process`);

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ subscription_id: string; error: string }>
    };

    // Process each subscription
    for (const subscription of subscriptions as SubscriptionToProcess[]) {
      try {
        console.log(`\n💳 Processing subscription ${subscription.id} (amount: $${subscription.amount})`);

        // Create Payment Intent
        const paymentIntentResponse = await fetch(`https://api.onvopay.com/v1/payment-intents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${onvoSecretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: Math.round(subscription.amount * 100), // Convert to cents
            currency: 'USD',
            customerId: subscription.client_id,
            description: `Recurring charge - ${subscription.interval_type}`,
            metadata: {
              subscription_id: subscription.id,
              charge_type: 'recurring',
              interval: subscription.interval_type
            }
          })
        });

        if (!paymentIntentResponse.ok) {
          throw new Error(`Failed to create Payment Intent: ${paymentIntentResponse.statusText}`);
        }

        const paymentIntent = await paymentIntentResponse.json();
        console.log(`✅ Payment Intent created: ${paymentIntent.id}`);

        // Confirm with saved payment method
        const confirmResponse = await fetch(`https://api.onvopay.com/v1/payment-intents/${paymentIntent.id}/confirm`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${onvoSecretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentMethodId: subscription.payment_method_id
          })
        });

        if (!confirmResponse.ok) {
          throw new Error(`Failed to confirm payment: ${confirmResponse.statusText}`);
        }

        const confirmedIntent = await confirmResponse.json();
        console.log(`✅ Payment confirmed and captured: ${confirmedIntent.id}`);

        // Save payment record
        await supabase
          .from('onvopay_payments')
          .insert({
            appointment_id: subscription.external_reference,
            client_id: subscription.client_id,
            provider_id: subscription.provider_id,
            onvopay_payment_id: confirmedIntent.id,
            amount: subscription.amount,
            payment_type: 'recurring_charge',
            status: 'captured',
            currency: 'USD',
            captured_at: new Date().toISOString()
          });

        // Calculate next charge date
        const currentDate = new Date(subscription.next_charge_date);
        let nextChargeDate: Date;

        switch (subscription.interval_type) {
          case 'weekly':
            nextChargeDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
            break;
          case 'biweekly':
            nextChargeDate = new Date(currentDate.setDate(currentDate.getDate() + 14));
            break;
          case 'three_weekly':
            nextChargeDate = new Date(currentDate.setDate(currentDate.getDate() + 21));
            break;
          case 'monthly':
            nextChargeDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
            break;
          default:
            nextChargeDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        }

        // Update subscription
        await supabase
          .from('onvopay_subscriptions')
          .update({
            last_charge_date: today,
            next_charge_date: nextChargeDate.toISOString().split('T')[0],
            failed_attempts: 0
          })
          .eq('id', subscription.id);

        results.successful++;
        console.log(`✅ Subscription ${subscription.id} processed successfully. Next charge: ${nextChargeDate.toISOString().split('T')[0]}`);

      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription.id}:`, error);
        
        // Increment failed attempts
        const newFailedAttempts = (subscription.failed_attempts || 0) + 1;
        const updateData: any = {
          failed_attempts: newFailedAttempts,
          last_failure_reason: error.message
        };

        // Cancel subscription if max retries reached
        if (newFailedAttempts >= subscription.max_retry_attempts) {
          updateData.status = 'cancelled';
          updateData.loop_status = 'loop_cancelled';
          console.log(`🚫 Subscription ${subscription.id} cancelled after ${newFailedAttempts} failed attempts`);
        }

        await supabase
          .from('onvopay_subscriptions')
          .update(updateData)
          .eq('id', subscription.id);

        results.failed++;
        results.errors.push({
          subscription_id: subscription.id,
          error: error.message
        });
      }
    }

    console.log(`\n✅ Processing complete: ${results.successful} successful, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total: subscriptions.length,
        successful: results.successful,
        failed: results.failed,
        errors: results.errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});