import { isToday, isSameWeek, isAfter, parseISO } from 'date-fns';
import { WeeklySlot } from '@/lib/weeklySlotTypes';

/**
 * Determines if we are looking at the current week
 */
export const isCurrentWeek = (weekIndex: number): boolean => {
  return weekIndex === 0;
};

/**
 * Filters out past slots for the current week only
 * For future weeks, returns all available slots
 */
export const filterTemporalSlots = (slots: WeeklySlot[], weekIndex: number): WeeklySlot[] => {
  // If this is not the current week, return all available slots
  if (!isCurrentWeek(weekIndex)) {
    return slots.filter(slot => slot.isAvailable);
  }

  // For current week, filter out past slots
  const now = new Date();
  
  return slots.filter(slot => {
    if (!slot.isAvailable) return false;
    
    // Create a full datetime for this slot
    const slotDateTime = createSlotDateTime(slot.date, slot.time);
    
    // For today's slots, only show future times
    if (isToday(slot.date)) {
      return isAfter(slotDateTime, now);
    }
    
    // For other days this week, show all available slots
    return true;
  });
};

/**
 * Creates a proper datetime object from date and time string
 */
export const createSlotDateTime = (date: Date, timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const slotDateTime = new Date(date);
  slotDateTime.setHours(hours, minutes, 0, 0);
  return slotDateTime;
};

/**
 * Determines the appropriate context message for the week
 */
export const getWeekContextMessage = (
  weekIndex: number, 
  hasSlots: boolean, 
  totalAvailableSlots: number
): string => {
  if (isCurrentWeek(weekIndex)) {
    if (!hasSlots) {
      return 'No hay más horarios disponibles esta semana';
    }
    return `${totalAvailableSlots} horarios disponibles desde ahora`;
  } else {
    if (!hasSlots) {
      return `No hay horarios disponibles en la semana ${weekIndex + 1}`;
    }
    return `${totalAvailableSlots} horarios disponibles`;
  }
};

/**
 * Gets the appropriate navigation hint based on context
 */
export const getNavigationHint = (weekIndex: number, hasSlots: boolean): string => {
  if (isCurrentWeek(weekIndex) && !hasSlots) {
    return 'Intenta la próxima semana';
  }
  if (!isCurrentWeek(weekIndex) && !hasSlots) {
    return 'Intenta otra semana';
  }
  return '';
};

/**
 * Determines if a slot should be shown based on temporal context
 */
export const shouldShowSlot = (slot: WeeklySlot, weekIndex: number): boolean => {
  if (!slot.isAvailable) return false;
  
  if (!isCurrentWeek(weekIndex)) {
    return true; // Show all available slots for future weeks
  }
  
  // For current week, check if slot is in the future
  const now = new Date();
  const slotDateTime = createSlotDateTime(slot.date, slot.time);
  
  if (isToday(slot.date)) {
    return isAfter(slotDateTime, now);
  }
  
  return true;
};