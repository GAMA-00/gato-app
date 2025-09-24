import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment configuration
function getOnvoConfig() {
  return {
    baseUrl: Deno.env.get('ONVOPAY_API_BASE') || 'https://api.dev.onvopay.com',
    path: Deno.env.get('ONVOPAY_API_PATH_CUSTOMERS') || '/v1/customers',
    debug: (Deno.env.get('ONVOPAY_DEBUG') || 'false') === 'true'
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

  try {
    const config = getOnvoConfig();
    const secretKey = Deno.env.get('ONVOPAY_SECRET_KEY');
    
    if (!secretKey) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'MISSING_CONFIG',
          hint: 'ONVOPAY_SECRET_KEY not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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

    const body = await req.json();
    const { clientId } = body;

    if (!clientId) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'INVALID_INPUT',
          hint: 'clientId requerido' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (config.debug) {
      console.log(`🔄 Syncing OnvoPay customer for client: ${clientId}`);
    }

    // Step 1: Check if customer mapping already exists
    const { data: existingCustomer } = await supabase
      .from('onvopay_customers')
      .select('onvopay_customer_id, synced_at')
      .eq('client_id', clientId)
      .single();

    if (existingCustomer?.onvopay_customer_id) {
      if (config.debug) {
        console.log(`✅ Customer mapping already exists: ${existingCustomer.onvopay_customer_id}`);
      }
      
      return new Response(
        JSON.stringify({ 
          ok: true, 
          onvopay_customer_id: existingCustomer.onvopay_customer_id,
          source: 'existing',
          synced_at: existingCustomer.synced_at
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 2: Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .eq('id', clientId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'USER_NOT_FOUND',
          hint: `Usuario no encontrado: ${clientId}` 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const normalized = normalizeData(user);

    // Step 3: Validate required data
    if (!normalized.email && !normalized.phone) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'MISSING_USER_DATA',
          hint: 'Se requiere email o phone para crear cliente en OnvoPay' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 4: Check for existing mapping by normalized data (fallback search)
    let existingByData = null;
    if (normalized.email) {
      const { data } = await supabase
        .from('onvopay_customers')
        .select('onvopay_customer_id, client_id, customer_data')
        .eq('normalized_email', normalized.email)
        .single();
      
      if (data) {
        existingByData = data;
        if (config.debug) {
          console.log(`🔍 Found existing customer by email: ${data.onvopay_customer_id} for client ${data.client_id}`);
        }
      }
    }

    if (!existingByData && normalized.phone) {
      const { data } = await supabase
        .from('onvopay_customers')
        .select('onvopay_customer_id, client_id, customer_data')
        .eq('normalized_phone', normalized.phone)
        .single();
      
      if (data) {
        existingByData = data;
        if (config.debug) {
          console.log(`🔍 Found existing customer by phone: ${data.onvopay_customer_id} for client ${data.client_id}`);
        }
      }
    }

    // If we found an existing customer for a different client, we can either:
    // 1. Create a new customer anyway (current approach)  
    // 2. Link to existing customer (risky - could merge different people)
    // For safety, we'll create a new customer but log the potential duplicate
    if (existingByData && existingByData.client_id !== clientId) {
      console.warn(`⚠️ Potential duplicate customer detected:`, {
        existingCustomerId: existingByData.onvopay_customer_id,
        existingClientId: existingByData.client_id,
        newClientId: clientId,
        sharedEmail: normalized.email,
        sharedPhone: normalized.phone
      });
    }

    // Step 5: Create customer in OnvoPay API
    const payload = {
      name: normalized.name || 'Sin nombre',
      ...(normalized.email && { email: normalized.email }),
      ...(normalized.phone && { phone: normalized.phone }),
      metadata: { internal_client_id: clientId, sync_source: 'manual' }
    };

    const url = `${config.baseUrl}${config.path}`;
    const headers = {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    };

    if (config.debug) {
      console.log(`📡 Creating OnvoPay customer:`, { url, payload });
    }

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const duration = Date.now() - startTime;

    if (config.debug) {
      console.log(`📡 OnvoPay API response (${duration}ms):`, {
        status: response.status,
        contentType,
        preview: responseText.slice(0, 256)
      });
    }

    let parsed = null;
    if (contentType.includes('application/json')) {
      try {
        parsed = JSON.parse(responseText);
      } catch {
        // Invalid JSON in response
      }
    }

    if (!response.ok) {
      const hint = contentType.includes('text/html') 
        ? 'Proveedor devolvió HTML (503/maintenance/WAF). No es JSON.'
        : response.status === 404 
        ? 'Revisa base, versión (/v1) y endpoint /customers'
        : 'Error en API de OnvoPay';

      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'ONVO_API_ERROR',
          status: response.status,
          hint,
          provider: parsed || responseText.slice(0, 1024)
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate response format
    if (!parsed || !parsed.id) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'ONVO_API_FORMAT',
          hint: 'Respuesta de OnvoPay sin ID de cliente' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const customerId = parsed.id;

    // Step 6: Save customer mapping to database
    const { error: insertError } = await supabase
      .from('onvopay_customers')
      .insert({
        client_id: clientId,
        onvopay_customer_id: customerId,
        customer_data: parsed,
        normalized_email: normalized.email || null,
        normalized_phone: normalized.phone || null,
        normalized_name: normalized.name || null,
        synced_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('❌ Failed to save OnvoPay customer mapping:', insertError);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'DB_UPDATE_ERROR',
          hint: 'No se pudo guardar el mapeo del cliente',
          details: insertError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (config.debug) {
      console.log(`✅ Successfully created and synced OnvoPay customer: ${customerId}`);
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        onvopay_customer_id: customerId,
        source: 'created',
        synced_at: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Unexpected error in onvopay-customer-sync:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        code: 'UNEXPECTED_ERROR',
        hint: 'Error interno del servidor',
        error: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});