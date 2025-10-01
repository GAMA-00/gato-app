/**
 * Recurring Slot Projection System
 * Projects recurring appointments into future time slots
 */

import { addWeeks, addMonths } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { DATE_CONFIG } from '@/lib/recurrence/config';

export interface RecurringAppointmentData {
  id: string;
  provider_id: string;
  listing_id: string;
  start_time: string;
  end_time: string;
  recurrence: string;
  status: string;
}

export interface ProjectedRecurringSlot {
  appointmentId: string;
  date: Date;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  recurrenceType: string;
}

/**
 * Calculate the next occurrence date based on recurrence type
 * Preserves exact time in Costa Rica timezone
 */
function getNextOccurrence(currentDate: Date, recurrence: string, originalTime: { hours: number; minutes: number }): Date {
  // Convert to Costa Rica timezone for operations
  const zonedDate = toZonedTime(currentDate, DATE_CONFIG.DEFAULT_TIMEZONE);
  
  // Add the interval
  let nextDate: Date;
  switch (recurrence) {
    case 'weekly':
      nextDate = addWeeks(zonedDate, 1);
      break;
    case 'biweekly':
      nextDate = addWeeks(zonedDate, 2);
      break;
    case 'triweekly':
      nextDate = addWeeks(zonedDate, 3);
      break;
    case 'monthly':
      nextDate = addMonths(zonedDate, 1);
      break;
    default:
      nextDate = addWeeks(zonedDate, 1);
  }
  
  // Ensure the exact time is preserved in Costa Rica timezone
  nextDate.setHours(originalTime.hours, originalTime.minutes, 0, 0);
  
  // Convert back from Costa Rica timezone
  return fromZonedTime(nextDate, DATE_CONFIG.DEFAULT_TIMEZONE);
}

/**
 * Project all future instances of a recurring appointment within a date range
 */
export function projectRecurringInstances(
  appointment: RecurringAppointmentData,
  startDate: Date,
  endDate: Date
): ProjectedRecurringSlot[] {
  const instances: ProjectedRecurringSlot[] = [];
  
  // Parse the appointment's start time in Costa Rica timezone
  const appointmentStart = new Date(appointment.start_time);
  const appointmentEnd = new Date(appointment.end_time);
  
  // Convert to Costa Rica timezone to extract exact time components
  const zonedStart = toZonedTime(appointmentStart, DATE_CONFIG.DEFAULT_TIMEZONE);
  const zonedEnd = toZonedTime(appointmentEnd, DATE_CONFIG.DEFAULT_TIMEZONE);
  
  // Extract time components (HH:mm) in Costa Rica timezone
  const startTimeStr = formatInTimeZone(appointmentStart, DATE_CONFIG.DEFAULT_TIMEZONE, 'HH:mm:ss');
  const endTimeStr = formatInTimeZone(appointmentEnd, DATE_CONFIG.DEFAULT_TIMEZONE, 'HH:mm:ss');
  
  // Store original time to preserve across all occurrences
  const originalTime = {
    hours: zonedStart.getHours(),
    minutes: zonedStart.getMinutes()
  };
  
  console.log(`🔄 Proyectando cita recurrente ${appointment.id}: ${startTimeStr}-${endTimeStr} (${appointment.recurrence})`);
  
  // Start from the original appointment's date in Costa Rica timezone
  let currentOccurrence = toZonedTime(appointmentStart, DATE_CONFIG.DEFAULT_TIMEZONE);
  currentOccurrence.setHours(originalTime.hours, originalTime.minutes, 0, 0);
  currentOccurrence = fromZonedTime(currentOccurrence, DATE_CONFIG.DEFAULT_TIMEZONE);
  
  // Generate first occurrence (the original appointment itself)
  if (currentOccurrence >= startDate && currentOccurrence <= endDate) {
    instances.push({
      appointmentId: appointment.id,
      date: new Date(currentOccurrence),
      startTime: startTimeStr,
      endTime: endTimeStr,
      recurrenceType: appointment.recurrence
    });
  }
  
  // Generate future occurrences - continue from first occurrence
  let nextOccurrence = getNextOccurrence(currentOccurrence, appointment.recurrence, originalTime);
  
  // Add safety limit to prevent infinite loops (max 100 iterations)
  let iterationCount = 0;
  const maxIterations = 100;
  
  while (nextOccurrence <= endDate && iterationCount < maxIterations) {
    if (nextOccurrence >= startDate) {
      instances.push({
        appointmentId: appointment.id,
        date: new Date(nextOccurrence),
        startTime: startTimeStr,
        endTime: endTimeStr,
        recurrenceType: appointment.recurrence
      });
      
      // Log for debugging timezone consistency
      const actualTime = formatInTimeZone(nextOccurrence, DATE_CONFIG.DEFAULT_TIMEZONE, 'HH:mm:ss');
      if (actualTime !== startTimeStr) {
        console.warn(`⚠️ Desalineación detectada: esperado ${startTimeStr}, obtenido ${actualTime}`);
      }
    }
    
    nextOccurrence = getNextOccurrence(nextOccurrence, appointment.recurrence, originalTime);
    iterationCount++;
  }
  
  if (iterationCount >= maxIterations) {
    console.warn(`⚠️ Reached max iterations for appointment ${appointment.id}`);
  }
  
  console.log(`✅ ${instances.length} instancias proyectadas para ${appointment.id}`);
  
  return instances;
}

/**
 * Project all recurring appointments for a provider/listing within a date range
 */
export function projectAllRecurringSlots(
  appointments: RecurringAppointmentData[],
  startDate: Date,
  endDate: Date
): Map<string, ProjectedRecurringSlot[]> {
  const projectionMap = new Map<string, ProjectedRecurringSlot[]>();
  
  // Filter to only active recurring appointments
  const recurringAppointments = appointments.filter(apt => 
    apt.recurrence && 
    apt.recurrence !== 'none' && 
    apt.recurrence !== '' &&
    apt.status === 'confirmed'
  );
  
  console.log(`📊 Proyectando ${recurringAppointments.length} citas recurrentes activas`);
  
  for (const appointment of recurringAppointments) {
    const instances = projectRecurringInstances(appointment, startDate, endDate);
    
    // Store instances by date+time key for quick lookup
    for (const instance of instances) {
      const dateKey = formatInTimeZone(instance.date, DATE_CONFIG.DEFAULT_TIMEZONE, 'yyyy-MM-dd');
      const timeKeySec = formatInTimeZone(instance.date, DATE_CONFIG.DEFAULT_TIMEZONE, 'HH:mm:ss');
      const timeKeyShort = formatInTimeZone(instance.date, DATE_CONFIG.DEFAULT_TIMEZONE, 'HH:mm');

      // Primary key with seconds precision
      const keyWithSeconds = `${dateKey}-${timeKeySec}`;
      if (!projectionMap.has(keyWithSeconds)) {
        projectionMap.set(keyWithSeconds, []);
      }
      projectionMap.get(keyWithSeconds)!.push(instance);

      // Backward-compatibility key without seconds
      const keyShort = `${dateKey}-${timeKeyShort}`;
      if (!projectionMap.has(keyShort)) {
        projectionMap.set(keyShort, []);
      }
      projectionMap.get(keyShort)!.push(instance);

      // Dev-only diagnostic
      if ((import.meta as any)?.env?.MODE === 'development') {
        console.debug(`🗝️ Recurrence index: ${keyWithSeconds} (alias: ${keyShort})`);
      }
    }
  }
  
  console.log(`🔮 Proyección generada: ${projectionMap.size} slots recurrentes futuros`);
  
  return projectionMap;
}

/**
 * Check if a specific slot matches a recurring projection
 */
export function isSlotRecurring(
  date: Date,
  time: string,
  projectionMap: Map<string, ProjectedRecurringSlot[]>
): { isRecurring: boolean; instances: ProjectedRecurringSlot[] } {
  const dateKey = formatInTimeZone(date, DATE_CONFIG.DEFAULT_TIMEZONE, 'yyyy-MM-dd');

  // Normalize time to seconds precision (HH:mm:ss)
  const timeWithSeconds = /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : `${time.slice(0,5)}:00`;
  const primaryKey = `${dateKey}-${timeWithSeconds}`;
  let instances = projectionMap.get(primaryKey) || [];

  if (instances.length === 0) {
    // Fallback to HH:mm (backward compatibility)
    const timeShort = timeWithSeconds.slice(0, 5);
    const fallbackKey = `${dateKey}-${timeShort}`;
    instances = projectionMap.get(fallbackKey) || [];
    if ((import.meta as any)?.env?.MODE === 'development') {
      console.debug(`🔍 isSlotRecurring fallback key used: ${fallbackKey} (primary was ${primaryKey})`);
    }
  } else {
    if ((import.meta as any)?.env?.MODE === 'development') {
      console.debug(`🔍 isSlotRecurring primary key used: ${primaryKey}`);
    }
  }

  return {
    isRecurring: instances.length > 0,
    instances
  };
}
