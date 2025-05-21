
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a duration in minutes into a readable format (HH:MM)
 * @param minutes - Duration in minutes
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
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
