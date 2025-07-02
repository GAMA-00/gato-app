import { addWeeks, addMonths, format, getDay, isSameDay, startOfDay } from 'date-fns';

export type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurrenceInfo {
  type: RecurrenceType;
  label: string;
  color: string;
  icon: string;
}

/**
 * Normalizes recurrence values from different sources to a standard format
 */
export const normalizeRecurrence = (recurrence: string | null | undefined): RecurrenceType => {
  if (!recurrence || recurrence === 'null' || recurrence === '') {
    return 'none';
  }

  const normalized = recurrence.toString().toLowerCase().trim();

  // Handle explicit "none" or "once" values
  if (normalized === 'none' || normalized === 'once' || normalized === 'una vez') {
    return 'none';
  }

  // Handle weekly patterns
  if (normalized === 'weekly' || normalized === 'semanal' || 
      (normalized.includes('week') && !normalized.includes('biweek') && !normalized.includes('2week'))) {
    return 'weekly';
  }

  // Handle biweekly patterns
  if (normalized === 'biweekly' || normalized === 'quincenal' || 
      normalized.includes('biweek') || normalized.includes('2week') || normalized === '2 weeks') {
    return 'biweekly';
  }

  // Handle monthly patterns
  if (normalized === 'monthly' || normalized === 'mensual' || normalized.includes('month')) {
    return 'monthly';
  }

  console.warn(`Unknown recurrence pattern: ${recurrence}, defaulting to 'none'`);
  return 'none';
};

/**
 * Gets display information for a recurrence type
 */
export const getRecurrenceInfo = (recurrence: string | null | undefined): RecurrenceInfo => {
  const type = normalizeRecurrence(recurrence);

  switch (type) {
    case 'weekly':
      return {
        type: 'weekly',
        label: 'Semanal',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: 'RotateCcw'
      };
    case 'biweekly':
      return {
        type: 'biweekly',
        label: 'Quincenal',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: 'Calendar'
      };
    case 'monthly':
      return {
        type: 'monthly',
        label: 'Mensual',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: 'Clock'
      };
    default:
      return {
        type: 'none',
        label: 'Una vez',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: 'Calendar'
      };
  }
};

/**
 * Checks if an appointment is recurring
 */
export const isRecurring = (recurrence: string | null | undefined): boolean => {
  return normalizeRecurrence(recurrence) !== 'none';
};

/**
 * Calculates the next occurrence date based on recurrence type
 */
export const calculateNextOccurrence = (
  currentDate: Date,
  recurrenceType: RecurrenceType,
  originalDate?: Date
): Date => {
  switch (recurrenceType) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'biweekly':
      return addWeeks(currentDate, 2);
    case 'monthly':
      return addMonths(currentDate, 1);
    default:
      return currentDate;
  }
};

/**
 * Validates if a date should have a recurring appointment instance
 * For biweekly appointments, ensures it's on the correct 2-week cycle
 */
export const shouldGenerateInstance = (
  targetDate: Date,
  originalDate: Date,
  recurrenceType: RecurrenceType
): boolean => {
  // Must be the same day of the week
  if (getDay(targetDate) !== getDay(originalDate)) {
    return false;
  }

  // For biweekly, check if it's on the correct 2-week cycle
  if (recurrenceType === 'biweekly') {
    const daysDiff = Math.floor((targetDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff % 14 === 0;
  }

  return true;
};

/**
 * Generates recurring appointment instances for a given date range
 */
export const generateRecurringInstances = (
  originalAppointment: any,
  startDate: Date,
  endDate: Date,
  maxInstances: number = 50
): any[] => {
  const recurrenceType = normalizeRecurrence(originalAppointment.recurrence);
  
  if (recurrenceType === 'none') {
    return [];
  }

  const instances: any[] = [];
  const originalStart = new Date(originalAppointment.start_time);
  const originalEnd = new Date(originalAppointment.end_time);
  const durationMs = originalEnd.getTime() - originalStart.getTime();

  let currentDate = new Date(originalStart);
  let instanceCount = 0;

  console.log(`Generating ${recurrenceType} instances from ${format(originalStart, 'yyyy-MM-dd HH:mm')}`);

  while (instanceCount < maxInstances && currentDate <= endDate) {
    // Check if this date should have an instance
    if (currentDate >= startDate && 
        currentDate <= endDate && 
        shouldGenerateInstance(currentDate, originalStart, recurrenceType)) {
      
      const instanceEnd = new Date(currentDate.getTime() + durationMs);
      
      const instance = {
        ...originalAppointment,
        id: `${originalAppointment.id}-recurring-${format(currentDate, 'yyyy-MM-dd-HH-mm')}`,
        start_time: currentDate.toISOString(),
        end_time: instanceEnd.toISOString(),
        is_recurring_instance: true,
      };
      
      instances.push(instance);
      console.log(`Generated ${recurrenceType} instance: ${format(currentDate, 'yyyy-MM-dd HH:mm')}`);
    }

    // Move to next occurrence
    currentDate = calculateNextOccurrence(currentDate, recurrenceType, originalStart);
    instanceCount++;
  }

  console.log(`Generated ${instances.length} ${recurrenceType} instances`);
  return instances;
};

/**
 * Debug helper to log recurrence information
 */
export const debugRecurrence = (appointment: any, prefix: string = '') => {
  const info = getRecurrenceInfo(appointment.recurrence);
  console.log(`${prefix}Recurrence Debug:`, {
    raw: appointment.recurrence,
    normalized: info.type,
    label: info.label,
    isRecurring: isRecurring(appointment.recurrence),
    appointmentId: appointment.id,
    clientName: appointment.client_name
  });
};