/**
 * Configuration utilities for OnvoPay integration
 * @module config
 */

import type { OnvoConfig } from './types.ts';

/**
 * CORS headers for cross-origin requests
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Feature flag: Allow bypassing customer creation when OnvoPay is unavailable
 * @default true
 */
export const CUSTOMER_OPTIONAL = (Deno.env.get('ONVOPAY_CUSTOMER_OPTIONAL') ?? 'true').toLowerCase() === 'true';

/**
 * Get OnvoPay API configuration from environment variables
 * @returns {OnvoConfig} Configuration object with API endpoints and settings
 */
export function getOnvoConfig(): OnvoConfig {
  const baseUrl = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com';
  const version = Deno.env.get('ONVOPAY_API_VERSION') || 'v1';
  const path = Deno.env.get('ONVOPAY_API_PATH_CUSTOMERS') || '/v1/customers';
  const debug = (Deno.env.get('ONVOPAY_DEBUG') || 'false') === 'true';
  
  return {
    baseUrl,
    version,
    path,
    debug,
    environment: baseUrl.includes('sandbox') || baseUrl.includes('test') ? 'SANDBOX' : 'PRODUCTION',
    fullUrl: `${baseUrl}/${version}/payment-intents`
  };
}

/**
 * Get required environment variables
 * @throws {Error} If ONVOPAY_SECRET_KEY is not configured
 */
export function getRequiredEnv(): {
  secretKey: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
} {
  const secretKey = Deno.env.get('ONVOPAY_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!secretKey) {
    throw new Error('ONVOPAY_SECRET_KEY not configured');
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return { secretKey, supabaseUrl, supabaseServiceKey };
}
