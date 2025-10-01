/**
 * Simplified Recurrence Utilities
 * Calculates recurring dates dynamically and handles exceptions
 */

import { addDays, addWeeks, addMonths, format, isSameDay } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { DATE_CONFIG } from '@/lib/recurrence/config';

export interface RecurringException {
  id: string;
  appointment_id: string;
  exception_date: string; // Esta es la fecha ORIGINAL que se cambió
  action_type: 'cancelled' | 'rescheduled';
  new_start_time?: string; // Nueva fecha/hora cuando se reagenda
  new_end_time?: string;
  notes?: string;
}

export interface RecurringAppointment {
  id: string;
  provider_id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  recurrence: string;
  status: string;
  listing_id: string;
  client_name?: string;
  provider_name?: string;
  notes?: string;
}

export interface CalculatedRecurringInstance {
  appointment_id: string;
  date: Date;
  start_time: Date;
  end_time: Date;
  status: 'scheduled' | 'cancelled' | 'rescheduled';
  original_appointment: RecurringAppointment;
  exception?: RecurringException;
  new_start_time?: Date;
  new_end_time?: Date;
}

/**
 * Calculate all recurring dates for an appointment within a date range
 * Preserves exact time in Costa Rica timezone
 */
export function calculateRecurringDates(
  appointment: RecurringAppointment,
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  const appointmentStart = new Date(appointment.start_time);
  
  // Convert to Costa Rica timezone and extract original time
  const zonedStart = toZonedTime(appointmentStart, DATE_CONFIG.DEFAULT_TIMEZONE);
  const originalTime = {
    hours: zonedStart.getHours(),
    minutes: zonedStart.getMinutes()
  };
  
  let currentDate = toZonedTime(appointmentStart, DATE_CONFIG.DEFAULT_TIMEZONE);
  currentDate.setHours(originalTime.hours, originalTime.minutes, 0, 0);
  currentDate = fromZonedTime(currentDate, DATE_CONFIG.DEFAULT_TIMEZONE);

  // Ensure we start from the correct date within our range
  while (currentDate < startDate) {
    currentDate = getNextRecurrenceDate(currentDate, appointment.recurrence, originalTime);
  }

  // Generate dates until end date
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate = getNextRecurrenceDate(currentDate, appointment.recurrence, originalTime);
  }

  return dates;
}

/**
 * Get the next recurrence date based on recurrence type
 * Preserves exact time in Costa Rica timezone
 */
function getNextRecurrenceDate(currentDate: Date, recurrence: string, originalTime: { hours: number; minutes: number }): Date {
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
      nextDate = addDays(zonedDate, 1);
  }
  
  // Ensure the exact time is preserved in Costa Rica timezone
  nextDate.setHours(originalTime.hours, originalTime.minutes, 0, 0);
  
  // Convert back from Costa Rica timezone
  return fromZonedTime(nextDate, DATE_CONFIG.DEFAULT_TIMEZONE);
}

/**
 * Apply exceptions to calculated recurring instances
 */
export function applyRecurringExceptions(
  appointment: RecurringAppointment,
  recurringDates: Date[],
  exceptions: RecurringException[]
): CalculatedRecurringInstance[] {
  const appointmentStart = new Date(appointment.start_time);
  const appointmentEnd = new Date(appointment.end_time);
  const duration = appointmentEnd.getTime() - appointmentStart.getTime();

  return recurringDates.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const exception = exceptions.find(ex => ex.exception_date === dateStr);
    
    // Calculate the time for this instance using Costa Rica timezone
    const timeStr = formatInTimeZone(appointmentStart, DATE_CONFIG.DEFAULT_TIMEZONE, 'HH:mm');
    const [hours, minutes] = timeStr.split(':').map(Number);
    const instanceStart = new Date(date);
    instanceStart.setHours(hours, minutes, 0, 0);
    const instanceEnd = new Date(instanceStart.getTime() + duration);

    const instance: CalculatedRecurringInstance = {
      appointment_id: appointment.id,
      date,
      start_time: instanceStart,
      end_time: instanceEnd,
      status: 'scheduled',
      original_appointment: appointment
    };

    if (exception) {
      instance.exception = exception;
      instance.status = exception.action_type as 'cancelled' | 'rescheduled';
      
      if (exception.action_type === 'rescheduled' && exception.new_start_time && exception.new_end_time) {
        instance.new_start_time = new Date(exception.new_start_time);
        instance.new_end_time = new Date(exception.new_end_time);
      }
    }

    return instance;
  });
}

/**
 * Check if a time slot conflicts with recurring appointments
 */
export function checkRecurringConflicts(
  recurringAppointments: RecurringAppointment[],
  exceptions: RecurringException[],
  proposedStart: Date,
  proposedEnd: Date,
  excludeAppointmentId?: string
): boolean {
  const proposedDate = startOfDay(proposedStart);

  for (const appointment of recurringAppointments) {
    if (excludeAppointmentId && appointment.id === excludeAppointmentId) {
      continue;
    }

    if (!appointment.recurrence || appointment.recurrence === 'none') {
      continue;
    }

    // Calculate if this appointment would occur on the proposed date
    const appointmentStart = new Date(appointment.start_time);
    const recurringDates = calculateRecurringDates(appointment, proposedDate, proposedDate);
    
    if (recurringDates.length === 0) {
      continue;
    }

    // Check if there's an exception for this date
    const dateStr = format(proposedDate, 'yyyy-MM-dd');
    const exception = exceptions.find(ex => 
      ex.appointment_id === appointment.id && ex.exception_date === dateStr
    );

    // If cancelled, no conflict
    if (exception?.action_type === 'cancelled') {
      continue;
    }

    // Get the actual time for this instance
    let instanceStart: Date;
    let instanceEnd: Date;

    if (exception?.action_type === 'rescheduled' && exception.new_start_time && exception.new_end_time) {
      instanceStart = new Date(exception.new_start_time);
      instanceEnd = new Date(exception.new_end_time);
    } else {
      const appointmentEnd = new Date(appointment.end_time);
      const duration = appointmentEnd.getTime() - appointmentStart.getTime();
      
      // Use Costa Rica timezone for consistent hour extraction
      const timeStr = formatInTimeZone(appointmentStart, DATE_CONFIG.DEFAULT_TIMEZONE, 'HH:mm');
      const [hours, minutes] = timeStr.split(':').map(Number);
      instanceStart = new Date(proposedDate);
      instanceStart.setHours(hours, minutes, 0, 0);
      instanceEnd = new Date(instanceStart.getTime() + duration);
    }

    // Check for time overlap
    if (proposedStart < instanceEnd && proposedEnd > instanceStart) {
      return true; // Conflict found
    }
  }

  return false; // No conflicts
}

/**
 * Get all recurring instances for a provider within a date range
 */
export function getAllRecurringInstances(
  appointments: RecurringAppointment[],
  exceptions: RecurringException[],
  startDate: Date,
  endDate: Date,
  providerId?: string
): CalculatedRecurringInstance[] {
  const allInstances: CalculatedRecurringInstance[] = [];

  for (const appointment of appointments) {
    if (providerId && appointment.provider_id !== providerId) {
      continue;
    }

    if (!appointment.recurrence || appointment.recurrence === 'none') {
      continue;
    }

    const recurringDates = calculateRecurringDates(appointment, startDate, endDate);
    const appointmentExceptions = exceptions.filter(ex => ex.appointment_id === appointment.id);
    const instances = applyRecurringExceptions(appointment, recurringDates, appointmentExceptions);
    
    allInstances.push(...instances);
  }

  return allInstances;
}

/**
 * Check if an appointment should show rescheduled styling
 */
export function getAppointmentRescheduleInfo(
  appointment: RecurringAppointment,
  appointmentDate: Date,
  exceptions: RecurringException[]
): { isRescheduled: boolean; styleClass: string; notes?: string } {
  const dateStr = format(appointmentDate, 'yyyy-MM-dd');
  
  // Check if there's an exception for this exact date (original date)
  const exception = exceptions.find(ex => 
    ex.appointment_id === appointment.id && 
    ex.exception_date === dateStr
  );
  
  if (exception) {
    if (exception.action_type === 'cancelled') {
      return {
        isRescheduled: true,
        styleClass: 'bg-red-100 border-red-300 text-red-700', // Rojo para canceladas
        notes: exception.notes
      };
    } else if (exception.action_type === 'rescheduled') {
      return {
        isRescheduled: true,
        styleClass: 'bg-orange-100 border-orange-300 text-orange-700', // Naranja para reagendadas
        notes: exception.notes
      };
    }
  }
  
  return { isRescheduled: false, styleClass: '' };
}