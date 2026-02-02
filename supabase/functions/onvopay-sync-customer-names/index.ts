/**
 * OnvoPay Customer Name Sync - Mass synchronization
 * 
 * Updates all existing OnvoPay customers with their current profile names
 * This ensures that the OnvoPay dashboard displays the correct customer names
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting OnvoPay customer name synchronization...');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const secretKey = Deno.env.get('ONVOPAY_SECRET_KEY');
    const baseUrl = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    if (!secretKey) {
      throw new Error('ONVOPAY_SECRET_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all customers with their profile names
    const { data: customers, error: fetchError } = await supabase
      .from('onvopay_customers')
      .select(`
        client_id,
        onvopay_customer_id,
        customer_data,
        users!inner(name)
      `);

    if (fetchError) {
      throw new Error(`Failed to fetch customers: ${fetchError.message}`);
    }

    console.log(`📊 Found ${customers?.length || 0} customers to check`);

    const updates: any[] = [];
    const errors: any[] = [];
    const skipped: any[] = [];

    for (const customer of customers || []) {
      const profileName = customer.users?.name?.trim();
      const onvoName = customer.customer_data?.name?.trim();

      // Skip if names match or no profile name
      if (!profileName) {
        skipped.push({
          client_id: customer.client_id,
          reason: 'No profile name'
        });
        continue;
      }

      if (profileName === onvoName) {
        skipped.push({
          client_id: customer.client_id,
          reason: 'Names already match'
        });
        continue;
      }

      console.log(`🔄 Updating: "${onvoName}" → "${profileName}"`);

      try {
        // Update customer in OnvoPay
        const response = await fetch(
          `${baseUrl}/v1/customers/${customer.onvopay_customer_id}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: profileName })
          }
        );

        if (response.ok) {
          const updatedCustomer = await response.json();
          
          // Update local database
          const { error: updateError } = await supabase
            .from('onvopay_customers')
            .update({
              customer_data: updatedCustomer,
              normalized_name: profileName,
              updated_at: new Date().toISOString()
            })
            .eq('client_id', customer.client_id);

          if (updateError) {
            errors.push({
              client_id: customer.client_id,
              onvopay_customer_id: customer.onvopay_customer_id,
              error: `DB update failed: ${updateError.message}`
            });
          } else {
            updates.push({ 
              client_id: customer.client_id,
              onvopay_customer_id: customer.onvopay_customer_id,
              old_name: onvoName || '(none)', 
              new_name: profileName 
            });
            console.log(`✅ Updated: ${customer.onvopay_customer_id}`);
          }
        } else {
          const errorText = await response.text();
          errors.push({
            client_id: customer.client_id,
            onvopay_customer_id: customer.onvopay_customer_id,
            error: `HTTP ${response.status}: ${errorText}`
          });
          console.error(`❌ Failed to update ${customer.onvopay_customer_id}: ${response.status}`);
        }
      } catch (err: any) {
        errors.push({
          client_id: customer.client_id,
          onvopay_customer_id: customer.onvopay_customer_id,
          error: err.message
        });
        console.error(`❌ Exception for ${customer.onvopay_customer_id}:`, err.message);
      }

      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_checked: customers?.length || 0,
        updates_applied: updates.length,
        errors: errors.length,
        skipped: skipped.length
      },
      updates,
      errors,
      skipped
    };

    console.log('✅ Synchronization completed:', result.summary);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Synchronization failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
