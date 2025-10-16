/**
 * Phone utilities for Costa Rica phone numbers
 * Format: +506XXXXXXXX (stored)
 * Display: XXXXXXXX (8 digits)
 */

/**
 * Formats a phone number for display (removes +506 prefix)
 * @param phone - Phone number in format +506XXXXXXXX
 * @returns 8-digit phone number for display
 */
export const formatPhoneForDisplay = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // If phone starts with +506, remove it
  if (phone.startsWith('+506')) {
    return phone.slice(4);
  }
  
  // If phone is already 8 digits, return as is
  if (/^\d{8}$/.test(phone)) {
    return phone;
  }
  
  // Otherwise, try to extract 8 digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 8) {
    return digits.slice(-8);
  }
  
  return phone;
};

/**
 * Formats a phone number for storage (+506 prefix)
 * @param phone - 8-digit phone number
 * @returns Phone number in format +506XXXXXXXX
 */
export const formatPhoneForStorage = (phone: string): string => {
  if (!phone) return '';
  
  // If already has +506, return as is
  if (phone.startsWith('+506')) {
    return phone;
  }
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If exactly 8 digits, add +506
  if (digits.length === 8) {
    return `+506${digits}`;
  }
  
  // If more than 8 digits, take last 8
  if (digits.length > 8) {
    return `+506${digits.slice(-8)}`;
  }
  
  // If less than 8 digits, still add prefix (validation should catch this)
  return `+506${digits}`;
};

/**
 * Validates a Costa Rica phone number (8 digits)
 * @param phone - Phone number to validate
 * @returns true if valid (8 digits), false otherwise
 */
export const isValidCostaRicaPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 8;
};
