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
  
  console.log('🏥 ONVOPAY HEALTH CHECK - Started', {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Environment diagnostics
    const diagnostics = {
      requestId,
      timestamp: new Date().toISOString(),
      onvopay: {
        mode: onvoConfig.mode,
        hasSecretKey: !!ONVOPAY_SECRET_KEY,
        keyPrefix: ONVOPAY_SECRET_KEY ? `${ONVOPAY_SECRET_KEY.substring(0, 8)}...` : 'NOT_SET',
        baseUrl: onvoConfig.baseUrl,
        version: onvoConfig.version,
        environment: onvoConfig.environment,
        fullUrl: onvoConfig.fullUrl,
        debug: onvoConfig.debug
      },
      supabase: {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT_SET'
      },
      customerOptional: (Deno.env.get('ONVOPAY_CUSTOMER_OPTIONAL') ?? 'true').toLowerCase() === 'true'
    };

    let healthStatus = 'healthy';
    const checks: any[] = [];

    // 1. Environment Variables Check
    checks.push({
      name: 'Environment Variables',
      status: ONVOPAY_SECRET_KEY && supabaseUrl && supabaseServiceKey ? 'pass' : 'fail',
      details: {
        onvopaySecretKey: !!ONVOPAY_SECRET_KEY,
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      }
    });

    if (!ONVOPAY_SECRET_KEY) {
      healthStatus = 'unhealthy';
    }

    // 2. OnvoPay API Connectivity Check
    let onvopayConnectivity = 'fail';
    let onvopayError = null;
    
    if (ONVOPAY_SECRET_KEY) {
      try {
        const testUrl = `${onvoConfig.fullUrl}/payment-intents`;
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        const responseText = await response.text();
        const contentType = response.headers.get('content-type') || '';
        
        checks.push({
          name: 'OnvoPay API Connectivity',
          status: response.status === 200 || response.status === 401 ? 'pass' : 'fail', // 401 is OK, means auth working
          details: {
            status: response.status,
            contentType,
            isJson: contentType.includes('application/json'),
            isHtml: contentType.includes('text/html'),
            responseLength: responseText.length,
            environment: onvoConfig.environment,
            url: testUrl
          }
        });

        if (response.status === 200 || response.status === 401) {
          onvopayConnectivity = 'pass';
        } else {
          healthStatus = 'degraded';
        }
      } catch (error: any) {
        onvopayError = error.message;
        healthStatus = 'degraded';
        checks.push({
          name: 'OnvoPay API Connectivity',
          status: 'fail',
          details: {
            error: error.message,
            environment: onvoConfig.environment
          }
        });
      }
    }

    // 3. Supabase Database Check
    let dbConnectivity = 'fail';
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const { data, error } = await supabase
          .from('onvopay_payments')
          .select('count')
          .limit(1);

        checks.push({
          name: 'Supabase Database',
          status: error ? 'fail' : 'pass',
          details: {
            hasError: !!error,
            errorMessage: error?.message,
            dataReturned: !!data
          }
        });

        if (!error) {
          dbConnectivity = 'pass';
        } else {
          healthStatus = 'degraded';
        }
      } catch (error: any) {
        healthStatus = 'degraded';
        checks.push({
          name: 'Supabase Database',
          status: 'fail',
          details: {
            error: error.message
          }
        });
      }
    }

    // 4. Recent Transactions Check
    if (dbConnectivity === 'pass') {
      try {
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
        
        const { data: recentPayments, error } = await supabase
          .from('onvopay_payments')
          .select('id, status, created_at, onvopay_payment_id')
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: recentWebhooks } = await supabase
          .from('onvopay_webhooks')
          .select('id, event_type, processed')
          .order('id', { ascending: false })
          .limit(3);

        checks.push({
          name: 'Recent Transactions',
          status: 'info',
          details: {
            recentPayments: recentPayments?.length || 0,
            recentWebhooks: recentWebhooks?.length || 0,
            lastPayment: recentPayments?.[0] || null,
            lastWebhook: recentWebhooks?.[0] || null
          }
        });
      } catch (error: any) {
        checks.push({
          name: 'Recent Transactions',
          status: 'fail',
          details: {
            error: error.message
          }
        });
      }
    }

    // Generate webhook URL for documentation
    const webhookUrl = `${supabaseUrl?.replace('https://', '').replace('.supabase.co', '')}.supabase.co/functions/v1/onvopay-webhook`;

    const result = {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      requestId,
      environment: onvoConfig.environment,
      diagnostics,
      checks,
      recommendations: {
        webhookConfiguration: {
          url: `https://${webhookUrl}`,
          events: ['payment.authorized', 'payment.captured', 'payment.failed'],
          note: 'Configure this URL in your OnvoPay dashboard webhook settings'
        },
        environmentCheck: `Currently using ${onvoConfig.environment} (mode: ${onvoConfig.mode})`,
        secretKeyConfig: onvoConfig.mode === 'test' 
          ? 'Using ONVOPAY_TEST_SECRET_KEY for sandbox'
          : 'Using ONVOPAY_LIVE_SECRET_KEY for production',
        environmentVariables: {
          core: {
            ONVOPAY_MODE: 'Set to "test" or "live"',
            ONVOPAY_TEST_SECRET_KEY: 'Secret key for sandbox environment',
            ONVOPAY_LIVE_SECRET_KEY: 'Secret key for production environment',
            SUPABASE_URL: 'Your Supabase project URL',
            SUPABASE_SERVICE_ROLE_KEY: 'Service role key for admin operations'
          },
          optional: {
            ONVOPAY_API_BASE_TEST: 'Custom sandbox API URL (default: https://sandbox.api.onvopay.com)',
            ONVOPAY_API_BASE_LIVE: 'Custom production API URL (default: https://api.onvopay.com)',
            ONVOPAY_API_VERSION: 'API version (default: v1)',
            ONVOPAY_DEBUG: 'Enable debug logging (true/false)',
            ONVOPAY_CUSTOMER_OPTIONAL: 'Allow bypass when customer service is down (true/false)'
          },
          legacy: {
            ONVOPAY_SECRET_KEY: 'Legacy secret key (use mode-specific keys instead)'
          }
        }
      }
    };

    console.log('🏥 Health check completed:', {
      status: healthStatus,
      checksCount: checks.length,
      environment: onvoConfig.environment
    });

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      requestId,
      error: error.message,
      message: 'Health check failed unexpectedly'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});