import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment configuration helper - unified across all OnvoPay functions
function getOnvoConfig() {
  const mode = Deno.env.get('ONVOPAY_MODE') || 'test';
  const isTest = mode === 'test';
  
  const baseUrl = isTest 
    ? (Deno.env.get('ONVOPAY_API_BASE_TEST') || 'https://sandbox.api.onvopay.com')
    : (Deno.env.get('ONVOPAY_API_BASE_LIVE') || 'https://api.onvopay.com');
  
  const secretKey = isTest
    ? Deno.env.get('ONVOPAY_TEST_SECRET_KEY')
    : Deno.env.get('ONVOPAY_LIVE_SECRET_KEY');
  
  // Fallback to legacy ONVOPAY_SECRET_KEY
  const finalSecretKey = secretKey || Deno.env.get('ONVOPAY_SECRET_KEY');
  
  const version = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  const debug = (Deno.env.get('ONVOPAY_DEBUG') || 'false') === 'true';
  
  return {
    mode,
    baseUrl,
    secretKey: finalSecretKey,
    version,
    debug,
    fullUrl: `${baseUrl}/${version}`,
    environment: isTest ? 'SANDBOX' : 'PRODUCTION'
  };
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  console.log('🔍 ONVOPAY TRANSACTION LOOKUP - Started', {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });

  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const onvoConfig = getOnvoConfig();
    const ONVOPAY_SECRET_KEY = onvoConfig.secretKey;
    
    if (!ONVOPAY_SECRET_KEY) {
      return new Response(JSON.stringify({
        error: 'CONFIGURATION_ERROR',
        message: 'OnvoPay secret key not configured'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse query params or request body
    const url = new URL(req.url);
    const paymentIntentId = url.searchParams.get('payment_intent_id');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const action = url.searchParams.get('action') || 'lookup';

    if (action === 'reconcile') {
      // Reconcile all recent transactions
      const { data: localPayments, error } = await supabase
        .from('onvopay_payments')
        .select('id, onvopay_payment_id, status, amount, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return new Response(JSON.stringify({
          error: 'DB_ERROR',
          message: error.message
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const reconciliation: any[] = [];

      for (const payment of localPayments || []) {
        try {
          const onvoUrl = `${onvoConfig.fullUrl}/payment-intents/${payment.onvopay_payment_id}`;
          const response = await fetch(onvoUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          });

          let onvoData = null;
          let onvoError = null;

          if (response.ok) {
            const responseText = await response.text();
            try {
              onvoData = JSON.parse(responseText);
            } catch {
              onvoError = 'Invalid JSON response';
            }
          } else {
            onvoError = `HTTP ${response.status}`;
          }

          reconciliation.push({
            localPayment: {
              id: payment.id,
              onvopay_payment_id: payment.onvopay_payment_id,
              status: payment.status,
              amount: payment.amount,
              created_at: payment.created_at
            },
            onvoPayment: onvoData,
            error: onvoError,
            match: onvoData ? {
              statusMatch: payment.status === (onvoData.status === 'succeeded' ? 'captured' : onvoData.status),
              amountMatch: payment.amount === onvoData.amount,
              exists: true
            } : { exists: false, error: onvoError }
          });

        } catch (error: any) {
          reconciliation.push({
            localPayment: {
              id: payment.id,
              onvopay_payment_id: payment.onvopay_payment_id,
              status: payment.status,
              amount: payment.amount
            },
            onvoPayment: null,
            error: error.message,
            match: { exists: false, error: error.message }
          });
        }
      }

      return new Response(JSON.stringify({
        action: 'reconcile',
        timestamp: new Date().toISOString(),
        environment: onvoConfig.environment,
        reconciliation,
        summary: {
          totalChecked: reconciliation.length,
          foundInOnvoPay: reconciliation.filter(r => r.match.exists).length,
          notFoundInOnvoPay: reconciliation.filter(r => !r.match.exists).length,
          statusMismatches: reconciliation.filter(r => r.match.exists && !r.match.statusMatch).length,
          amountMismatches: reconciliation.filter(r => r.match.exists && !r.match.amountMatch).length
        }
      }, null, 2), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!paymentIntentId) {
      return new Response(JSON.stringify({
        error: 'MISSING_PARAMETER',
        message: 'payment_intent_id is required'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Lookup specific transaction
    console.log('🔎 Looking up transaction:', paymentIntentId);

    // 1. Get local payment record
    const { data: localPayment, error: localError } = await supabase
      .from('onvopay_payments')
      .select('*')
      .eq('onvopay_payment_id', paymentIntentId)
      .single();

    // 2. Get OnvoPay transaction
    const onvoUrl = `${onvoConfig.fullUrl}/payment-intents/${paymentIntentId}`;
    
    let onvoPayment = null;
    let onvoError = null;

    try {
      const response = await fetch(onvoUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const responseText = await response.text();
      const contentType = response.headers.get('content-type') || '';

      console.log('📡 OnvoPay API response:', {
        status: response.status,
        contentType,
        responseLength: responseText.length
      });

      if (response.ok) {
        if (contentType.includes('application/json')) {
          onvoPayment = JSON.parse(responseText);
        } else {
          onvoError = 'Non-JSON response from OnvoPay';
        }
      } else {
        onvoError = `HTTP ${response.status}: ${responseText.substring(0, 200)}`;
      }

    } catch (error: any) {
      onvoError = error.message;
    }

    const result = {
      requestId,
      timestamp: new Date().toISOString(),
      environment: onvoConfig.environment,
      paymentIntentId,
      localPayment: localPayment || null,
      localError: localError?.message || null,
      onvoPayment,
      onvoError,
      comparison: localPayment && onvoPayment ? {
        statusMatch: localPayment.status === (onvoPayment.status === 'succeeded' ? 'captured' : onvoPayment.status),
        amountMatch: localPayment.amount === onvoPayment.amount,
        localStatus: localPayment.status,
        onvoStatus: onvoPayment.status,
        localAmount: localPayment.amount,
        onvoAmount: onvoPayment.amount,
        createdAtMatch: localPayment.created_at && onvoPayment.createdAt,
        mode: onvoPayment.mode
      } : null,
      recommendations: !onvoPayment ? [
        'Transaction not found in OnvoPay - check if using correct environment (sandbox vs production)',
        'Verify ONVOPAY_SECRET_KEY matches the environment where transaction was created',
        'Check OnvoPay dashboard for transaction visibility settings'
      ] : localPayment && onvoPayment && localPayment.status !== (onvoPayment.status === 'succeeded' ? 'captured' : onvoPayment.status) ? [
        'Status mismatch detected - consider implementing webhook handling',
        'Local status may be outdated - run reconciliation process'
      ] : [
        'Transaction found and synchronized correctly'
      ]
    };

    console.log('✅ Transaction lookup completed:', {
      found: !!onvoPayment,
      statusMatch: result.comparison?.statusMatch,
      environment: onvoConfig.environment
    });

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Transaction lookup failed:', error);
    return new Response(JSON.stringify({
      error: 'LOOKUP_ERROR',
      message: error.message,
      requestId,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});