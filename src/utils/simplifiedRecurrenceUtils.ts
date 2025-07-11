/**
 * Simplified Recurrence Utilities
 * Calculates recurring dates dynamically and handles exceptions
 */

import { addDays, addWeeks, addMonths, format, startOfDay, isSameDay } from 'date-fns';

export interface RecurringException {
  id: string;
  appointment_id: string;
  exception_date: string;
  original_date?: string; // Nueva propiedad para rastrear la fecha original
  action_type: 'cancelled' | 'rescheduled';
  new_start_time?: string;
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
 */
export function calculateRecurringDates(
  appointment: RecurringAppointment,
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  const appointmentStart = new Date(appointment.start_time);
  let currentDate = new Date(appointmentStart);

  // Ensure we start from the correct date within our range
  while (currentDate < startDate) {
    currentDate = getNextRecurrenceDate(currentDate, appointment.recurrence);
  }

  // Generate dates until end date
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate = getNextRecurrenceDate(currentDate, appointment.recurrence);
  }

  return dates;
}

/**
 * Get the next recurrence date based on recurrence type
 */
function getNextRecurrenceDate(currentDate: Date, recurrence: string): Date {
  switch (recurrence) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'biweekly':
      return addWeeks(currentDate, 2);
    case 'monthly':
      return addMonths(currentDate, 1);
    default:
      return addDays(currentDate, 1); // fallback
  }
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
    
    // Calculate the time for this instance
    const instanceStart = new Date(date);
    instanceStart.setHours(appointmentStart.getHours(), appointmentStart.getMinutes(), 0, 0);
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
      
      instanceStart = new Date(proposedDate);
      instanceStart.setHours(appointmentStart.getHours(), appointmentStart.getMinutes(), 0, 0);
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
 * Check if an original appointment date should be hidden due to rescheduling
 */
export function shouldHideOriginalDate(
  appointment: RecurringAppointment,
  appointmentDate: Date,
  exceptions: RecurringException[]
): boolean {
  const dateStr = format(appointmentDate, 'yyyy-MM-dd');
  
  // Check if there's a rescheduling exception for this exact date
  const exception = exceptions.find(ex => 
    ex.appointment_id === appointment.id && 
    ex.original_date === dateStr &&
    ex.action_type === 'rescheduled'
  );
  
  return !!exception;
}

/**
 * Get style class for appointment based on its status
 */
export function getAppointmentStyleClass(
  appointment: RecurringAppointment,
  appointmentDate: Date,
  exceptions: RecurringException[]
): string {
  const dateStr = format(appointmentDate, 'yyyy-MM-dd');
  
  // Check for exceptions on this date
  const exception = exceptions.find(ex => 
    ex.appointment_id === appointment.id && 
    ex.original_date === dateStr
  );
  
  if (exception) {
    if (exception.action_type === 'cancelled') {
      return 'bg-red-100 border-red-300 text-red-700'; // Rojo para canceladas
    } else if (exception.action_type === 'rescheduled') {
      return 'bg-orange-100 border-orange-300 text-orange-700'; // Naranja para reagendadas
    }
  }
  
  return ''; // Estilo normal
}