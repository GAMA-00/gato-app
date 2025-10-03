/**
 * Payment intent creation for OnvoPay
 * @module payment
 */

import { getOnvoConfig } from './config.ts';
import { sleep } from './utils.ts';
import type { OnvoPaymentIntentData } from './types.ts';

/**
 * Create a payment intent in OnvoPay
 * 
 * This function creates a payment intent with retry logic and comprehensive error handling.
 * It handles various failure modes including:
 * - Network timeouts
 * - Service unavailability (503, 502, 504)
 * - Non-JSON responses (HTML error pages)
 * - Invalid API responses
 * 
 * @param {OnvoPaymentIntentData} paymentData - Payment intent data
 * @param {string} secretKey - OnvoPay secret key
 * @param {string} requestId - Unique request ID for tracking
 * @returns {Promise<any>} OnvoPay payment intent response
 * @throws {Error} If payment intent creation fails after retries
 */
export async function createPaymentIntent(
  paymentData: OnvoPaymentIntentData,
  secretKey: string,
  requestId: string
): Promise<any> {
  const config = getOnvoConfig();
  const url = `${config.baseUrl}/v1/payment-intents`;
  
  const startTime = Date.now();
  console.log('🔐 Creating Payment Intent...', {
    requestId,
    appointmentId: paymentData.metadata.appointment_id,
    amount: paymentData.amount,
    timestamp: new Date().toISOString()
  });
  
  let attempt = 0;
  const maxRetries = 2;
  
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseText = await response.text();
      const contentType = response.headers.get('content-type') || '';
      const responseTimeMs = Date.now() - startTime;

      console.log(`📡 Payment Intent API response (attempt ${attempt + 1}):`, {
        requestId,
        status: response.status,
        responseTimeMs,
        contentType,
        url,
        hasContent: responseText.length > 0
      });

      // Validate JSON response
      if (!contentType.includes('application/json')) {
        const isHTML = contentType.includes('text/html') || responseText.trim().startsWith('<');
        const hint = getErrorHint(response.status);
        
        throw {
          code: 'NON_JSON_RESPONSE',
          status: response.status,
          hint,
          isHTML,
          contentType,
          bodyPreview: responseText.substring(0, 500)
        };
      }
    
      // Parse JSON
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        throw {
          code: 'INVALID_JSON',
          status: response.status,
          bodyPreview: responseText.substring(0, 300)
        };
      }

      // Check for API errors
      if (!response.ok || result.error) {
        console.error('❌ OnvoPay API error:', {
          status: response.status,
          url,
          error: result.error || result
        });
        
        throw {
          code: 'ONVOPAY_API_ERROR',
          status: response.status,
          message: result.error?.message || result.message || 'Error en procesamiento de pago',
          onvoPayError: result.error
        };
      }

      // Success
      console.log('✅ Payment Intent created:', {
        id: result.id,
        status: result.status,
        duration: `${Date.now() - startTime}ms`
      });

      return result;

    } catch (error: any) {
      console.error(`❌ Payment Intent API call failed (attempt ${attempt + 1}):`, error.message);
      
      // Retry on network errors or timeouts
      if (attempt < maxRetries && (error.name === 'TimeoutError' || error.message?.includes('network'))) {
        attempt++;
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await sleep(backoffMs);
        continue;
      }
      
      // Re-throw error
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Get appropriate error hint based on HTTP status code
 * @param {number} status - HTTP status code
 * @returns {string} User-friendly error hint
 */
function getErrorHint(status: number): string {
  switch (status) {
    case 503:
      return 'OnvoPay service temporarily unavailable (503). Usually means maintenance or API overload.';
    case 404:
      return 'Endpoint not found. Check: 1) API base URL (sandbox vs prod), 2) API version (/v1), 3) Resource name (payment-intents with hyphens)';
    case 401:
      return 'Invalid ONVOPAY_SECRET_KEY or missing Authorization header';
    case 500:
      return 'OnvoPay internal server error. Try again in a few minutes.';
    default:
      return 'Non-JSON response from OnvoPay';
  }
}
