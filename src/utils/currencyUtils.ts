/**
 * Utility functions for standardized currency formatting across the app
 * Supports USD (dollars) and CRC (colones)
 */

export type CurrencyCode = 'USD' | 'CRC';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  CRC: '₡'
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: 'USD (Dólares)',
  CRC: 'CRC (Colones)'
};

/**
 * Formats a price value as currency
 * @param price - The price value (number, string, or null/undefined)
 * @param currency - Currency code: 'USD' or 'CRC' (default: 'USD')
 * @returns Formatted price string (e.g., "$1,234", "₡13,500")
 */
export const formatCurrency = (
  price: number | string | null | undefined,
  currency: CurrencyCode = 'USD'
): string => {
  if (price === null || price === undefined) return currency === 'CRC' ? '₡0' : '$0';
  
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numericPrice) || numericPrice < 0) return currency === 'CRC' ? '₡0' : '$0';
  
  // Format based on currency
  const locale = currency === 'CRC' ? 'es-CR' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'CRC' ? 0 : 2
  }).format(numericPrice);
};

/**
 * Gets the currency symbol for a currency code
 */
export const getCurrencySymbol = (currency: CurrencyCode = 'USD'): string => {
  return CURRENCY_SYMBOLS[currency] || '$';
};

/**
 * Alias for formatCurrency to maintain backward compatibility
 * @deprecated Use formatCurrency instead
 */
export const formatPrice = formatCurrency;

/**
 * Parses a price string or number into a numeric value
 * @param price - The price value to parse
 * @returns Numeric price value or 0 if invalid
 */
export const parsePrice = (price: string | number | null | undefined): number => {
  if (price === null || price === undefined) return 0;
  
  if (typeof price === 'number') {
    return isNaN(price) ? 0 : Math.max(0, price);
  }
  
  // Remove currency symbols and parse
  const cleanPrice = price.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanPrice);
  
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
};

/**
 * Formats a price range (min to max)
 * @param minPrice - Minimum price
 * @param maxPrice - Maximum price
 * @returns Formatted price range string (e.g., "$50 - $100")
 */
export const formatPriceRange = (
  minPrice: number | string | null | undefined,
  maxPrice: number | string | null | undefined
): string => {
  const min = parsePrice(minPrice);
  const max = parsePrice(maxPrice);
  
  if (min === max || max === 0) {
    return formatCurrency(min);
  }
  
  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
};

/**
 * Validates if a price value is valid
 * @param price - The price value to validate
 * @returns True if the price is a valid positive number
 */
export const isValidPrice = (price: any): boolean => {
  const parsed = parsePrice(price);
  return parsed > 0;
};