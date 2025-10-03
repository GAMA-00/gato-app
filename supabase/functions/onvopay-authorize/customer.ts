/**
 * Customer management for OnvoPay integration
 * @module customer
 */

import { getOnvoConfig } from './config.ts';
import { normalizeData, sleep } from './utils.ts';
import type { BillingInfo, CustomError } from './types.ts';

/**
 * Ensure OnvoPay customer exists, creating one if necessary
 * 
 * Process:
 * 1. Check if customer mapping already exists in database
 * 2. If not, fetch user data from database
 * 3. Check for duplicate customers by email/phone
 * 4. Create new customer in OnvoPay API if needed
 * 5. Save customer mapping to database
 * 
 * @param {any} supabase - Supabase client
 * @param {string} clientId - User ID in our system
 * @param {BillingInfo} billingInfo - Optional billing information
 * @returns {Promise<string>} OnvoPay customer ID
 * @throws {CustomError} If customer creation fails
 */
export async function ensureOnvoCustomer(
  supabase: any,
  clientId: string,
  billingInfo?: BillingInfo
): Promise<string> {
  const config = getOnvoConfig();
  const secretKey = Deno.env.get('ONVOPAY_SECRET_KEY');

  if (!secretKey) {
    throw new Error('ONVOPAY_SECRET_KEY not configured');
  }

  // Step 1: Check if customer mapping already exists by client_id
  const { data: existingCustomer } = await supabase
    .from('onvopay_customers')
    .select('onvopay_customer_id, normalized_email, normalized_phone')
    .eq('client_id', clientId)
    .maybeSingle();

  // If customer already exists in OnvoPay, reuse it
  if (existingCustomer?.onvopay_customer_id) {
    console.log(`🔄 Found existing OnvoPay customer for client ${clientId}: ${existingCustomer.onvopay_customer_id}`);
    return existingCustomer.onvopay_customer_id;
  }

  // Step 2: Get user data for customer creation
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email, phone')
    .eq('id', clientId)
    .single();

  if (userError || !user) {
    throw new Error(`User not found: ${clientId}`);
  }

  // Merge user data with billing info (billing info takes priority)
  const mergedData = {
    name: billingInfo?.name || user.name,
    email: billingInfo?.email || user.email,
    phone: billingInfo?.phone || user.phone
  };

  console.log(`📥 Billing info:`, JSON.stringify(billingInfo, null, 2));
  console.log(`📥 User data:`, JSON.stringify({ name: user.name, email: user.email, phone: user.phone }, null, 2));

  const normalized = normalizeData(mergedData);

  // Step 2.5: Enhanced deduplication - check for existing customers by email/phone
  if (normalized.email || normalized.phone) {
    const { data: duplicateCustomers } = await supabase
      .from('onvopay_customers')
      .select('onvopay_customer_id, client_id, normalized_email, normalized_phone')
      .or(`normalized_email.eq.${normalized.email || 'null'},normalized_phone.eq.${normalized.phone || 'null'}`)
      .limit(5);

    if (duplicateCustomers && duplicateCustomers.length > 0) {
      console.log(`⚠️ Found potential duplicate customers for user ${clientId}:`, 
        duplicateCustomers.map((c: any) => ({ 
          onvopay_customer_id: c.onvopay_customer_id,
          client_id: c.client_id,
          email: c.normalized_email,
          phone: c.normalized_phone
        }))
      );
      
      // If there's a customer with same email/phone but different client_id, reuse it
      const exactMatch = duplicateCustomers.find((c: any) => 
        (normalized.email && c.normalized_email === normalized.email) ||
        (normalized.phone && c.normalized_phone === normalized.phone)
      );
      
      if (exactMatch && exactMatch.client_id !== clientId) {
        console.log(`🔄 Reusing existing OnvoPay customer: ${exactMatch.onvopay_customer_id}`);
        
        // Update the mapping to current client
        const { error: updateError } = await supabase
          .from('onvopay_customers')
          .update({ 
            client_id: clientId,
            updated_at: new Date().toISOString() 
          })
          .eq('onvopay_customer_id', exactMatch.onvopay_customer_id);
        
        if (!updateError) {
          return exactMatch.onvopay_customer_id;
        }
      }
    }
  }

  // Step 3: Validate required data
  if (!normalized.email && !normalized.phone) {
    throw {
      code: 'MISSING_USER_DATA',
      status: 400,
      hint: 'Se requiere email o phone para crear el cliente en OnvoPay'
    } as CustomError;
  }

  // Step 4: Create customer in OnvoPay API
  const customerName = billingInfo?.name?.trim() || user.name?.trim() || 'Cliente';

  const payload: any = {
    name: customerName,
    ...(normalized.email && { email: normalized.email }),
    ...(normalized.phone && { phone: normalized.phone })
  };

  // Add address if available
  if (billingInfo?.address) {
    payload.address = {
      line1: billingInfo.address,
      country: 'CR'
    };
    payload.shipping = {
      name: customerName,
      address: {
        line1: billingInfo.address,
        country: 'CR'
      }
    };
  }
  
  console.log(`📋 Creating OnvoPay customer:`, JSON.stringify(payload, null, 2));

  const url = `${config.baseUrl}${config.path}`;
  const headers = {
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/json'
  };

  // Retry logic with exponential backoff
  let attempt = 0;
  const maxRetries = 2;
  
  while (attempt <= maxRetries) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      const contentType = response.headers.get('content-type') || '';
      const duration = Date.now() - startTime;

      if (config.debug) {
        console.log(`📡 OnvoPay customer API (attempt ${attempt + 1}):`, {
          method: 'POST',
          url,
          status: response.status,
          duration: `${duration}ms`,
          contentType
        });
      }

      let parsed = null;
      if (contentType.includes('application/json')) {
        try {
          parsed = JSON.parse(responseText);
        } catch {
          // Invalid JSON
        }
      }

      if (!response.ok) {
        // Retry on server errors
        if (attempt < maxRetries && (response.status >= 500 || !contentType.includes('application/json'))) {
          attempt++;
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await sleep(backoffMs);
          continue;
        }

        const hint = contentType.includes('text/html') 
          ? 'Proveedor devolvió HTML (503/maintenance). No es JSON.'
          : response.status === 404 
          ? 'Revisa endpoint /customers'
          : 'Error en API de OnvoPay';

        console.error(`❌ OnvoPay customer API error:`, {
          status: response.status,
          payload,
          response: parsed || responseText.slice(0, 1024)
        });

        throw {
          code: 'ONVO_API_ERROR',
          status: response.status,
          hint,
          provider: parsed || responseText.slice(0, 1024)
        } as CustomError;
      }

      // Validate response format
      if (!parsed || !parsed.id) {
        throw {
          code: 'ONVO_API_FORMAT',
          status: 400,
          hint: 'Respuesta de OnvoPay sin ID de cliente'
        } as CustomError;
      }

      const customerId = parsed.id;

      // Step 5: Save customer mapping with conflict handling
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
        // Handle race condition
        if (insertError.code === '23505') {
          console.log(`ℹ️ Customer mapping exists (race condition)`);
          const { data: existingAfterConflict } = await supabase
            .from('onvopay_customers')
            .select('onvopay_customer_id')
            .eq('client_id', clientId)
            .single();
          
          if (existingAfterConflict?.onvopay_customer_id) {
            return existingAfterConflict.onvopay_customer_id;
          }
        }
        
        console.error('❌ Failed to save customer mapping:', insertError);
        throw {
          code: 'DB_UPDATE_ERROR',
          status: 500,
          hint: 'No se pudo guardar el mapeo del cliente',
          details: insertError.message
        } as CustomError;
      }

      if (config.debug) {
        console.log(`✅ Created OnvoPay customer: ${customerId}`);
      }

      return customerId;

    } catch (error: any) {
      if (error.code) {
        throw error;
      }
      
      // Network errors - retry
      if (attempt < maxRetries) {
        attempt++;
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Network error, retrying in ${backoffMs}ms:`, error.message);
        await sleep(backoffMs);
        continue;
      }
      
      throw {
        code: 'NETWORK_ERROR',
        status: 500,
        hint: 'Error de red al conectar con OnvoPay',
        details: error.message
      } as CustomError;
    }
  }

  throw new Error('Max retries exceeded');
}
