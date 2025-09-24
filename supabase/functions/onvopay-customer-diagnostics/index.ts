import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Initialize Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔍 Running OnvoPay customer diagnostics...');

    // 1. Count total users vs users with OnvoPay customer mapping
    const { data: totalUsersData, error: totalUsersError } = await supabase
      .from('users')
      .select('id, role')
      .eq('role', 'client');

    if (totalUsersError) {
      throw new Error(`Failed to count users: ${totalUsersError.message}`);
    }

    const totalClients = totalUsersData?.length || 0;

    // 2. Count users with OnvoPay customer mapping
    const { data: mappedCustomersData, error: mappedCustomersError } = await supabase
      .from('onvopay_customers')
      .select('client_id, onvopay_customer_id, synced_at')
      .not('onvopay_customer_id', 'is', null);

    if (mappedCustomersError) {
      throw new Error(`Failed to count mapped customers: ${mappedCustomersError.message}`);
    }

    const totalMapped = mappedCustomersData?.length || 0;

    // 3. Count payments without associated customer (if they exist)
    const { data: paymentsWithoutCustomer, error: paymentsError } = await supabase
      .from('onvopay_payments')
      .select('id, client_id, created_at')
      .is('onvopay_customer_id', null); // This column might not exist, that's ok

    const paymentsWithoutCustomerCount = paymentsWithoutCustomer?.length || 0;

    // 4. Find candidates for sync (users without mapping but with email/phone)
    const { data: candidatesData, error: candidatesError } = await supabase
      .from('users')
      .select(`
        id, 
        name, 
        email, 
        phone, 
        created_at,
        onvopay_customers!left (client_id)
      `)
      .eq('role', 'client')
      .is('onvopay_customers.client_id', null)
      .or('email.neq.null,phone.neq.null')
      .limit(50); // Limit for performance

    if (candidatesError) {
      console.warn('⚠️ Failed to fetch sync candidates:', candidatesError.message);
    }

    const candidates = candidatesData?.map(user => ({
      client_id: user.id,
      normalized_email: user.email ? user.email.trim().toLowerCase() : null,
      normalized_phone: user.phone ? user.phone.replace(/[^0-9]/g, '') : null,
      name: user.name,
      created_at: user.created_at
    })) || [];

    // 5. Check for recent API errors (this would require a separate error log table)
    // For now, we'll just provide a placeholder
    const recentApiErrors = 0; // Would need error logging to implement

    // 6. Calculate reuse rate
    const reuseRate = totalMapped > 0 ? 
      Math.round((totalMapped / Math.max(totalClients, 1)) * 100) : 0;

    // 7. Identify potential duplicates - simplified query
    const duplicatesCount = 0; // Simplified for now - would need custom query

    // Build comprehensive response
    const diagnostics = {
      ok: true,
      timestamp: new Date().toISOString(),
      totals: {
        total_clients: totalClients,
        clients_with_onvopay_mapping: totalMapped,
        clients_without_mapping: totalClients - totalMapped,
        payments_without_customer: paymentsWithoutCustomerCount,
        sync_candidates: candidates.length,
        potential_duplicates: duplicatesCount,
        recent_api_errors: recentApiErrors
      },
      metrics: {
        mapping_coverage_percentage: reuseRate,
        sync_success_rate: totalMapped > 0 ? 100 : 0, // Would need error tracking
        last_sync_activity: mappedCustomersData?.reduce((latest, customer) => {
          const syncTime = new Date(customer.synced_at || 0).getTime();
          return syncTime > latest ? syncTime : latest;
        }, 0) || null
      },
      candidates: candidates.slice(0, 10), // First 10 candidates
      recommendations: [] as Array<{
        type: string;
        priority: string;
        message: string;
        action: string;
      }>
    };

    // Add recommendations based on findings
    if (totalClients - totalMapped > 5) {
      diagnostics.recommendations.push({
        type: 'sync_missing',
        priority: 'high',
        message: `${totalClients - totalMapped} clientes sin mapeo OnvoPay. Considera ejecutar sync masivo.`,
        action: 'bulk_sync'
      });
    }

    if (paymentsWithoutCustomerCount > 0) {
      diagnostics.recommendations.push({
        type: 'orphaned_payments',
        priority: 'medium',
        message: `${paymentsWithoutCustomerCount} pagos sin cliente asociado.`,
        action: 'associate_payments'
      });
    }

    if (duplicatesCount > 0) {
      diagnostics.recommendations.push({
        type: 'potential_duplicates',
        priority: 'low',
        message: `${duplicatesCount} posibles duplicados detectados.`,
        action: 'review_duplicates'
      });
    }

    if (reuseRate < 50) {
      diagnostics.recommendations.push({
        type: 'low_reuse',
        priority: 'medium',
        message: `Tasa de reutilización baja (${reuseRate}%). Verificar flujo de creación.`,
        action: 'audit_creation_flow'
      });
    }

    console.log('✅ Diagnostics completed:', {
      totalClients,
      totalMapped,
      reuseRate: `${reuseRate}%`,
      candidatesCount: candidates.length
    });

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in onvopay-customer-diagnostics:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});