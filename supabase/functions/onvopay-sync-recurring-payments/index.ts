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

    console.log('🔄 Starting recurring payments sync...');

    // Get active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('onvopay_subscriptions')
      .select('*')
      .eq('status', 'active');

    if (subError) {
      throw subError;
    }

    let synced = 0;
    let errors = 0;
    
    for (const sub of subscriptions || []) {
      try {
        // Fetch subscription details from OnvoPay
        const response = await fetch(
          `${config.fullUrl}/subscriptions/${sub.onvopay_subscription_id}`,
          {
            headers: { 
              'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          console.error(`❌ Failed to fetch subscription ${sub.onvopay_subscription_id}`);
          errors++;
          continue;
        }

        const onvoData = await response.json();

        // Check for invoices/charges not in our DB
        const invoices = onvoData.invoices || [];
        
        for (const invoice of invoices) {
          if (invoice.status === 'paid') {
            // Check if we already have this payment
            const { data: existing } = await supabase
              .from('onvopay_payments')
              .select('id')
              .eq('onvopay_payment_id', invoice.id)
              .single();

            if (!existing) {
              // Create missing payment record
              const { error: insertError } = await supabase
                .from('onvopay_payments')
                .insert({
                  appointment_id: sub.external_reference,
                  client_id: sub.client_id,
                  provider_id: sub.provider_id,
                  onvopay_payment_id: invoice.id,
                  amount: invoice.amount_paid,
                  subtotal: invoice.amount_paid,
                  iva_amount: 0,
                  payment_type: 'recurring',
                  payment_method: 'card',
                  status: 'captured',
                  onvopay_response: invoice,
                  authorized_at: invoice.paid_at || new Date().toISOString(),
                  captured_at: invoice.paid_at || new Date().toISOString()
                });
              
              if (insertError) {
                console.error('❌ Error inserting payment:', insertError);
                errors++;
              } else {
                console.log('✅ Synced payment:', invoice.id);
                synced++;
              }
            }
          }
        }

        // Update subscription status if changed
        if (onvoData.status && onvoData.status !== sub.status) {
          await supabase
            .from('onvopay_subscriptions')
            .update({ status: onvoData.status })
            .eq('id', sub.id);
        }

      } catch (error) {
        console.error(`❌ Error syncing subscription ${sub.id}:`, error);
        errors++;
      }
    }

    console.log('✅ Sync complete:', { synced, errors });

    return new Response(JSON.stringify({
      success: true,
      subscriptions_checked: subscriptions?.length || 0,
      payments_synced: synced,
      errors: errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
