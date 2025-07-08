// Pure utility functions for time slot generation
// Moved outside components to prevent re-renders

export interface TimeSlot {
  id: string;
  time: string;
  displayTime: string;
  period: 'AM' | 'PM';
}

/**
 * Generate time slots for a given service duration
 * Pure function - no dependencies, no side effects
 */
export const generateTimeSlots = (serviceDuration: number): string[] => {
  const slots: string[] = [];
  
  // Generate slots from 7 AM to 7 PM
  for (let hour = 7; hour < 19; hour++) {
    for (let minute = 0; minute < 60; minute += serviceDuration) {
      // Make sure we don't exceed 7 PM
      if (hour === 18 && minute > 0) break;
      
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  
  return slots;
};

/**
 * Format 24-hour time to 12-hour format with AM/PM
 */
export const formatTimeTo12Hour = (time24: string): { time: string; period: 'AM' | 'PM' } => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  
  return {
    time: `${hours12}:${minutes.toString().padStart(2, '0')}`,
    period
  };
};

/**
 * Create a unique slot ID
 */
export const createSlotId = (date: Date, time: string): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}-${time}`;
};

/**
 * Check if a time overlaps with another time range
 */
export const checkTimeOverlap = (
  startTime1: Date,
  endTime1: Date,
  startTime2: Date,
  endTime2: Date
): boolean => {
  return startTime1 < endTime2 && endTime1 > startTime2;
};