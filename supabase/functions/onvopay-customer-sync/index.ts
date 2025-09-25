import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment configuration
function getOnvoConfig() {
  const baseUrl = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.dev.onvopay.com';
  const version = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  const path = Deno.env.get('ONVOPAY_API_PATH_CUSTOMERS') || '/v1/customers';
  const debug = (Deno.env.get('ONVOPAY_DEBUG') || 'false') === 'true';
  
  return {
    baseUrl,
    version,
    path,
    debug,
    fullUrl: `${baseUrl}/${version}/customers`
  };
}

// Normalize data for consistent searching
function normalizeData(data: any) {
  return {
    email: data.email ? data.email.trim().toLowerCase() : '',
    phone: data.phone ? data.phone.replace(/[^0-9]/g, '') : '',
    name: data.name ? data.name.trim() : ''
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 ONVOPAY CUSTOMER SYNC - Function started');
  console.log('🔎 Request info:', { method: req.method, url: req.url });

  try {
    const config = getOnvoConfig();
    const secretKey = Deno.env.get('ONVOPAY_SECRET_KEY');
    
    if (!secretKey) {
      console.error('❌ Missing ONVOPAY_SECRET_KEY environment variable');
      return new Response(JSON.stringify({
        success: false,
        error: 'CONFIGURATION_ERROR',
        message: 'Configuración de OnvoPay incompleta - falta secret key'
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

    // Parse request body
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error('❌ Invalid JSON body:', e);
      return new Response(JSON.stringify({
        success: false,
        error: 'INVALID_JSON',
        message: 'El cuerpo del request no es JSON válido'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { client_id } = body;
    if (!client_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'client_id es requerido'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('📋 Syncing customer for client_id:', client_id);

    // Step 1: Check if customer mapping already exists
    const { data: existingCustomer } = await supabase
      .from('onvopay_customers')
      .select('onvopay_customer_id, synced_at')
      .eq('client_id', client_id)
      .single();

    if (existingCustomer?.onvopay_customer_id) {
      const syncAge = Date.now() - new Date(existingCustomer.synced_at).getTime();
      const syncAgeHours = syncAge / (1000 * 60 * 60);
      
      console.log(`✅ Customer already exists: ${existingCustomer.onvopay_customer_id} (synced ${syncAgeHours.toFixed(1)}h ago)`);
      
      return new Response(JSON.stringify({
        success: true,
        customer_id: existingCustomer.onvopay_customer_id,
        status: 'existing',
        message: 'Cliente ya existe en OnvoPay'
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Step 2: Get user data for customer creation
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .eq('id', client_id)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return new Response(JSON.stringify({
        success: false,
        error: 'USER_NOT_FOUND',
        message: `Usuario no encontrado: ${client_id}`
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalized = normalizeData(user);

    // Step 3: Validate required data
    if (!normalized.email && !normalized.phone) {
      return new Response(JSON.stringify({
        success: false,
        error: 'MISSING_USER_DATA',
        message: 'Se requiere email o phone para crear el cliente en OnvoPay'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 4: Create customer in OnvoPay API
    const payload = {
      name: normalized.name || 'Sin nombre',
      ...(normalized.email && { email: normalized.email }),
      ...(normalized.phone && { phone: normalized.phone }),
      metadata: { internal_client_id: client_id }
    };

    const url = `${config.baseUrl}${config.path}`;
    const headers = {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `customer-sync-${client_id}`
    };

    console.log('📡 Creating customer in OnvoPay...', {
      url,
      hasEmail: !!normalized.email,
      hasPhone: !!normalized.phone,
      hasName: !!normalized.name
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    console.log('🔍 OnvoPay customer API response:', {
      status: response.status,
      contentType,
      bodyLength: responseText.length,
      isJSON: contentType.includes('application/json')
    });

    if (!response.ok) {
      // Best effort - if service is down, don't fail the sync but log it
      if (response.status >= 500 || !contentType.includes('application/json')) {
        console.warn('⚠️ OnvoPay customer sync failed due to service unavailability', {
          status: response.status,
          contentType,
          clientId: client_id
        });
        
        return new Response(JSON.stringify({
          success: false,
          error: 'SERVICE_UNAVAILABLE',
          message: 'Servicio temporalmente no disponible para sincronización de cliente',
          status: 'down'
        }), { 
          status: 200, // Don't fail the request, this is best effort
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      console.error('❌ OnvoPay customer API error:', responseText);
      return new Response(JSON.stringify({
        success: false,
        error: 'ONVO_API_ERROR',
        message: 'Error creando cliente en OnvoPay',
        status: response.status
      }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Invalid JSON response:', e);
      return new Response(JSON.stringify({
        success: false,
        error: 'INVALID_JSON',
        message: 'Respuesta inválida de OnvoPay'
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!parsed || !parsed.id) {
      console.error('❌ Invalid response format:', parsed);
      return new Response(JSON.stringify({
        success: false,
        error: 'INVALID_RESPONSE',
        message: 'Respuesta de OnvoPay sin ID de cliente'
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const customerId = parsed.id;

    // Step 5: Save customer mapping to database
    const { error: insertError } = await supabase
      .from('onvopay_customers')
      .insert({
        client_id: client_id,
        onvopay_customer_id: customerId,
        customer_data: parsed,
        normalized_email: normalized.email || null,
        normalized_phone: normalized.phone || null,
        normalized_name: normalized.name || null,
        synced_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('❌ Failed to save OnvoPay customer mapping:', insertError);
      return new Response(JSON.stringify({
        success: false,
        error: 'DB_UPDATE_ERROR',
        message: 'No se pudo guardar el mapeo del cliente',
        details: insertError.message
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('✅ Customer created and synced successfully:', customerId);

    return new Response(JSON.stringify({
      success: true,
      customer_id: customerId,
      status: 'created',
      message: 'Cliente creado y sincronizado exitosamente'
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('❌ Customer sync function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'FUNCTION_ERROR',
      message: error.message || 'Error sincronizando cliente',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});