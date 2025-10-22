/**
 * OnvoPay Payment Method Creation Edge Function
 * 
 * This function tokenizes card data by creating a payment method in OnvoPay.
 * The payment_method_id can then be reused for payments without exposing card details.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🎫 CREATE PAYMENT METHOD - Function started');

  try {
    const secretKey = Deno.env.get('ONVOPAY_SECRET_KEY');
    const baseUrl = Deno.env.get('ONVOPAY_API_BASE') || 'https://api.onvopay.com';

    if (!secretKey) {
      throw new Error('ONVOPAY_SECRET_KEY not configured');
    }

    // Parse request body
    const body = await req.json();
    console.log('📦 Request body received');

    // Validate required fields
    if (!body.card_data) {
      return new Response(JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'card_data is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { number, expiry, cvv, name } = body.card_data;

    if (!number || !expiry || !cvv || !name) {
      return new Response(JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'All card fields are required: number, expiry, cvv, name'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse expiry date (MM/YY or MM/YYYY)
    const expiryClean = expiry.replace(/\D/g, '');
    let exp_month: string;
    let exp_year: string;

    if (expiryClean.length === 4) {
      // MMYY format
      exp_month = expiryClean.substring(0, 2);
      exp_year = expiryClean.substring(2, 4);
    } else if (expiryClean.length === 6) {
      // MMYYYY format
      exp_month = expiryClean.substring(0, 2);
      exp_year = expiryClean.substring(4, 6); // Take last 2 digits
    } else {
      return new Response(JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'Invalid expiry format. Use MM/YY or MM/YYYY'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate month (01-12)
    const monthNum = parseInt(exp_month, 10);
    if (monthNum < 1 || monthNum > 12) {
      return new Response(JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'Invalid expiry month. Must be between 01 and 12'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate year (must be current year or future)
    const currentYear = new Date().getFullYear();
    const fullYear = parseInt(exp_year, 10) + 2000;

    if (fullYear < currentYear) {
      return new Response(JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'Card has expired'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (fullYear > 2100) {
      return new Response(JSON.stringify({
        error: 'VALIDATION_ERROR',
        message: 'Invalid expiry year'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build payment method payload
    const payload = {
      type: 'card',
      card: {
        number: number.replace(/\D/g, ''),
        expMonth: parseInt(exp_month, 10),
        expYear: parseInt(exp_year, 10) + 2000,
        cvv: cvv,
        holderName: name.trim()
      }
    };

    console.log('📤 Creating payment method with OnvoPay:', {
      last4: payload.card.number.slice(-4),
      expMonth: payload.card.expMonth,
      expYear: payload.card.expYear,
      holderName: payload.card.holderName
    });

    // Call OnvoPay API
    const url = `${baseUrl}/v1/payment-methods`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    console.log('📡 OnvoPay response:', {
      status: response.status,
      contentType
    });

    // Parse response
    let parsed = null;
    if (contentType.includes('application/json')) {
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Invalid JSON response:', responseText.substring(0, 200));
      }
    }

    if (!response.ok) {
      console.error('❌ OnvoPay API error:', {
        status: response.status,
        response: parsed || responseText.substring(0, 500)
      });

      return new Response(JSON.stringify({
        error: 'ONVOPAY_API_ERROR',
        message: parsed?.message || 'Error creating payment method',
        status: response.status,
        details: parsed?.error || responseText.substring(0, 200)
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate response format
    if (!parsed || !parsed.id) {
      console.error('❌ Invalid response format:', parsed);
      return new Response(JSON.stringify({
        error: 'INVALID_RESPONSE',
        message: 'OnvoPay response missing payment_method_id'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Payment method created:', parsed.id);

    return new Response(JSON.stringify({
      success: true,
      payment_method_id: parsed.id,
      card: {
        last4: parsed.card?.last4 || number.slice(-4),
        brand: parsed.card?.brand || 'unknown',
        exp_month: parsed.card?.exp_month || exp_month,
        exp_year: parsed.card?.exp_year || exp_year
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Function error:', error);

    return new Response(JSON.stringify({
      error: 'FUNCTION_ERROR',
      message: error.message || 'Error processing payment method creation',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
