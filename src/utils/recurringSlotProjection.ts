/**
 * Recurring Slot Projection System
 * Projects recurring appointments into future time slots
 */

import { addWeeks, addMonths, format, startOfDay } from 'date-fns';

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
 */
function getNextOccurrence(currentDate: Date, recurrence: string): Date {
  switch (recurrence) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'biweekly':
      return addWeeks(currentDate, 2);
    case 'triweekly':
      return addWeeks(currentDate, 3);
    case 'monthly':
      return addMonths(currentDate, 1);
    default:
      return addWeeks(currentDate, 1); // default to weekly
  }
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
  
  // Parse the appointment's start time
  const appointmentStart = new Date(appointment.start_time);
  const appointmentEnd = new Date(appointment.end_time);
  
  // Extract time components (HH:mm)
  const startTimeStr = format(appointmentStart, 'HH:mm');
  const endTimeStr = format(appointmentEnd, 'HH:mm');
  
  // Start from the appointment's date
  let currentOccurrence = startOfDay(appointmentStart);
  
  // Move to first occurrence within or after startDate
  while (currentOccurrence < startDate) {
    currentOccurrence = getNextOccurrence(currentOccurrence, appointment.recurrence);
  }
  
  // Generate all occurrences until endDate
  while (currentOccurrence <= endDate) {
    instances.push({
      appointmentId: appointment.id,
      date: new Date(currentOccurrence),
      startTime: startTimeStr,
      endTime: endTimeStr,
      recurrenceType: appointment.recurrence
    });
    
    currentOccurrence = getNextOccurrence(currentOccurrence, appointment.recurrence);
  }
  
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
      const key = `${format(instance.date, 'yyyy-MM-dd')}-${instance.startTime}`;
      
      if (!projectionMap.has(key)) {
        projectionMap.set(key, []);
      }
      projectionMap.get(key)!.push(instance);
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
  const key = `${format(date, 'yyyy-MM-dd')}-${time}`;
  const instances = projectionMap.get(key) || [];
  
  return {
    isRecurring: instances.length > 0,
    instances
  };
}
