import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment configuration helper
function getOnvoConfig() {
  const baseUrl = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com';
  const version = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  const debug = (Deno.env.get('ONVOPAY_DEBUG') || 'false') === 'true';
  
  return {
    baseUrl,
    version,
    debug,
    fullUrl: `${baseUrl}/${version}`,
    environment: baseUrl.includes('sandbox') || baseUrl.includes('test') ? 'SANDBOX' : 'PRODUCTION'
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
    const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Environment diagnostics
    const diagnostics = {
      requestId,
      timestamp: new Date().toISOString(),
      onvopay: {
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
        environmentVariables: {
          required: ['ONVOPAY_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
          optional: ['ONVOPAY_API_BASE', 'ONVOPAY_API_VERSION', 'ONVOPAY_DEBUG', 'ONVOPAY_CUSTOMER_OPTIONAL']
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