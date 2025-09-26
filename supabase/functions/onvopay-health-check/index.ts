import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment configuration
function getOnvoConfig() {
  const baseUrl = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.dev.onvopay.com';
  const version = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  
  return {
    baseUrl,
    version,
    healthUrl: `${baseUrl}/health`
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    const config = getOnvoConfig();
    const secretKey = Deno.env.get('ONVOPAY_SECRET_KEY');
    
    console.log('🔍 Starting OnvoPay health check...', {
      requestId,
      healthUrl: config.healthUrl,
      hasSecretKey: !!secretKey
    });

    if (!secretKey) {
      return new Response(JSON.stringify({
        success: false,
        status: 'unhealthy',
        error: 'CONFIGURATION_ERROR',
        message: 'ONVOPAY_SECRET_KEY not configured',
        requestId,
        responseTime: Date.now() - startTime
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test basic connectivity to OnvoPay
    const healthResponse = await fetch(config.healthUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseTime = Date.now() - startTime;
    const isHealthy = healthResponse.status >= 200 && healthResponse.status < 400;

    console.log('🔍 OnvoPay health check result:', {
      requestId,
      status: healthResponse.status,
      isHealthy,
      responseTime: `${responseTime}ms`,
      contentType: healthResponse.headers.get('content-type')
    });

    let responseBody = '';
    try {
      responseBody = await healthResponse.text();
    } catch (e) {
      console.warn('⚠️ Could not read health response body:', (e as Error)?.message || 'Unknown error');
    }

    return new Response(JSON.stringify({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      httpStatus: healthResponse.status,
      responseTime: `${responseTime}ms`,
      requestId,
      timestamp: new Date().toISOString(),
      details: {
        url: config.healthUrl,
        hasResponse: !!responseBody,
        responseLength: responseBody.length
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('❌ OnvoPay health check failed:', {
      requestId,
      error: error.message,
      name: error.name,
      responseTime: `${responseTime}ms`
    });

    return new Response(JSON.stringify({
      success: false,
      status: 'unhealthy',
      error: 'CONNECTIVITY_ERROR',
      message: error.message || 'Failed to connect to OnvoPay',
      requestId,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});