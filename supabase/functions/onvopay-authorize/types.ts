/**
 * Type definitions for OnvoPay payment authorization
 * @module types
 */

/**
 * Configuration for OnvoPay API
 */
export interface OnvoConfig {
  baseUrl: string;
  version: string;
  path: string;
  debug: boolean;
  environment: 'SANDBOX' | 'PRODUCTION';
  fullUrl: string;
}

/**
 * Card data for payment processing
 */
export interface CardData {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

/**
 * Billing information
 */
export interface BillingInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

/**
 * Normalized user data for customer creation
 */
export interface NormalizedData {
  email: string;
  phone: string;
  name: string;
}

/**
 * Request body for payment authorization
 */
export interface AuthorizePaymentRequest {
  appointmentId: string;
  amount: number;
  card_data: CardData;
  billing_info: BillingInfo;
  payment_type?: string;
}

/**
 * OnvoPay payment intent request payload
 */
export interface OnvoPaymentIntentData {
  amount: number;
  currency: string;
  description: string;
  customer?: string;  // OnvoPay customer ID at root level for dashboard association
  metadata: {
    appointment_id: string;
    client_id: string;
    provider_id: string;
    is_post_payment: string;
    customer_name?: string;
    onvopay_customer_id?: string;
  };
}

/**
 * Custom error with code and status
 */
export interface CustomError {
  code: string;
  status: number;
  hint?: string;
  details?: string;
  provider?: any;
}
