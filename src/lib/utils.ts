
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a duration in minutes into a readable format
 * @param minutes - Duration in minutes
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes === 0) {
    return '0min';
  }
  
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Converts 24-hour time format to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (HH:MM)
 */
export function formatTo12Hour(time24: string): string {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Converts 12-hour time format with AM/PM to 24-hour format
 * @param time12 - Time in 12-hour format (h:MM AM/PM)
 */
export function formatTo24Hour(time12: string): string {
  const [timePart, period] = time12.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  
  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Formats a price value as USD currency (with $ symbol)
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
}

/**
 * Formats a price value with localized number formatting in USD (with $ symbol)
 * @param amount - The amount to format
 */
export function formatCurrencyLocalized(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 */
export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a date with proper Spanish capitalization for day/month names
 * Wrapper around date-fns format that ensures proper capitalization
 * @param date - The date to format
 * @param formatStr - The format string (same as date-fns)
 * @param options - Format options including locale
 */
export function formatDateES(date: Date | string, formatStr: string, options?: any): string {
  const { format } = require('date-fns');
  const formatted = format(typeof date === 'string' ? new Date(date) : date, formatStr, options);
  
  // Capitalize first letter for Spanish day/month names
  return capitalizeFirst(formatted);
}
