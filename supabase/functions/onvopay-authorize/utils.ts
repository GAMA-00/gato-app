/**
 * Utility functions for data processing
 * @module utils
 */

import type { NormalizedData } from './types.ts';

/**
 * Format phone number for OnvoPay API (expects international format with +)
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number with country code
 * 
 * @example
 * formatPhoneForOnvoPay('88887777') // '+50688887777'
 * formatPhoneForOnvoPay('50688887777') // '+50688887777'
 */
export function formatPhoneForOnvoPay(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  
  // If already has country code (506), format as +506XXXXXXXX
  if (cleanPhone.startsWith('506') && cleanPhone.length === 11) {
    return `+${cleanPhone}`;
  }
  
  // If it's 8 digits, add Costa Rica country code
  if (cleanPhone.length === 8) {
    return `+506${cleanPhone}`;
  }
  
  // Return as-is with + if it looks like international format
  return cleanPhone.length > 8 ? `+${cleanPhone}` : cleanPhone;
}

/**
 * Normalize user data for consistent searching and comparison
 * @param {any} data - Raw user data
 * @returns {NormalizedData} Normalized data with trimmed and lowercased values
 */
export function normalizeData(data: any): NormalizedData {
  return {
    email: data.email ? data.email.trim().toLowerCase() : '',
    phone: data.phone ? formatPhoneForOnvoPay(data.phone) : '',
    name: data.name ? data.name.trim() : ''
  };
}

/**
 * IVA rates by currency
 * - CRC: 13% (Costa Rica)
 * - USD: 0% (No IVA for USD transactions)
 */
const IVA_RATES: Record<string, number> = {
  'CRC': 0.13,
  'USD': 0,
};

/**
 * Calculate payment amounts including IVA based on currency
 * @param {number} totalAmount - Total amount in the currency
 * @param {string} currency - Currency code (USD or CRC)
 * @returns Object with amounts in cents (subtotal, IVA, total)
 */
export function calculateAmounts(totalAmount: number, currency: string = 'USD'): {
  amountCents: number;
  subtotalCents: number;
  ivaCents: number;
} {
  const ivaRate = IVA_RATES[currency] || 0;
  const amountCents = Math.round(totalAmount * 100);
  
  // If there's IVA, calculate subtotal without IVA
  const subtotalCents = ivaRate > 0 
    ? Math.round(amountCents / (1 + ivaRate))
    : amountCents;
  const ivaCents = amountCents - subtotalCents;

  return { amountCents, subtotalCents, ivaCents };
}

/**
 * Wait for a specified duration (for retry backoff)
 * @param {number} ms - Milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error indicates service unavailability
 * @param {any} error - Error object
 * @returns {boolean} True if error indicates service is down
 */
export function isServiceDownError(error: any): boolean {
  const status = Number(error?.status);
  const isServerError = status === 502 || status === 503 || status === 504;
  const hasDownIndicator = /HTML|WAF|maintenance/i.test(String(error?.hint ?? error?.message));
  
  return isServerError || hasDownIndicator;
}
