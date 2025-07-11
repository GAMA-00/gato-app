import { supabase } from '@/integrations/supabase/client';
import { isSameDay, format, addWeeks, addDays, addMonths } from 'date-fns';
import { checkRecurringConflicts as checkRecurringConflictsUtil, type RecurringAppointment, type RecurringException } from '@/utils/simplifiedRecurrenceUtils';

interface ConflictCheckResult {
  hasConflict: boolean;
  conflictReason?: string;
  conflictDetails?: any;
}

export const validateAppointmentSlot = async (
  providerId: string,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
): Promise<ConflictCheckResult> => {
  try {
    console.log(`Validating availability for provider ${providerId}: ${format(startTime, 'yyyy-MM-dd HH:mm')} - ${format(endTime, 'yyyy-MM-dd HH:mm')}`);

    // 1. Check regular appointments
    let query = supabase
      .from('appointments')
      .select('id, start_time, end_time, client_name, status, external_booking, listing_id, recurrence')
      .eq('provider_id', providerId)
      .in('status', ['pending', 'confirmed', 'completed', 'scheduled']);

    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }

    const { data: allAppointments, error: appointmentsError } = await query;

    if (appointmentsError) {
      console.error('Error checking provider appointments:', appointmentsError);
      return { hasConflict: false };
    }

    console.log(`Found ${allAppointments?.length || 0} appointments to check for provider ${providerId}`);

    // Check for conflicts with regular appointments
    if (allAppointments) {
      for (const appointment of allAppointments) {
        const appointmentStart = new Date(appointment.start_time);
        const appointmentEnd = new Date(appointment.end_time);
        
        // Check if times overlap
        if (startTime < appointmentEnd && endTime > appointmentStart) {
          console.log(`Conflict found with appointment ${appointment.id}`);
          return {
            hasConflict: true,
            conflictReason: appointment.external_booking 
              ? 'Conflicto con cita externa' 
              : 'Conflicto con cita existente',
            conflictDetails: {
              type: appointment.external_booking ? 'external' : 'internal',
              appointment: appointment,
              time: `${format(appointmentStart, 'HH:mm')} - ${format(appointmentEnd, 'HH:mm')}`,
              isRecurring: appointment.recurrence && appointment.recurrence !== 'none'
            }
          };
        }
      }
    }

    // 2. Check recurring appointments conflicts
    const { data: recurringAppointments, error: recurringError } = await supabase
      .from('appointments')
      .select('*')
      .eq('provider_id', providerId)
      .neq('recurrence', 'none')
      .not('recurrence', 'is', null)
      .in('status', ['confirmed', 'pending']);

    if (recurringError) {
      console.error('Error checking recurring appointments:', recurringError);
      return { hasConflict: false };
    }

    // Get recurring exceptions
    const appointmentIds = (recurringAppointments || []).map(app => app.id);
    let exceptions: RecurringException[] = [];

    if (appointmentIds.length > 0) {
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('recurring_exceptions')
        .select('*')
        .in('appointment_id', appointmentIds);

      if (!exceptionsError) {
        exceptions = (exceptionsData || []) as RecurringException[];
      }
    }

    // Check for recurring conflicts using the new utility
    const hasRecurringConflict = checkRecurringConflictsUtil(
      recurringAppointments as RecurringAppointment[] || [],
      exceptions,
      startTime,
      endTime
    );

    if (hasRecurringConflict) {
      return {
        hasConflict: true,
        conflictReason: 'Conflicto con cita recurrente',
        conflictDetails: {
          type: 'recurring',
          time: `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`
        }
      };
    }

    console.log('No conflicts found - slot is available');
    return { hasConflict: false };

  } catch (error) {
    console.error('Error in validateAppointmentSlot:', error);
    return { hasConflict: false };
  }
};

// Legacy function - kept for compatibility but simplified
export const checkRecurringConflicts = async (
  providerId: string,
  startTime: Date,
  endTime: Date,
  recurrence: string
): Promise<ConflictCheckResult> => {
  if (recurrence === 'once' || recurrence === 'none') {
    return { hasConflict: false };
  }

  try {
    console.log(`Checking recurring conflicts for ${recurrence} recurrence`);
    
    // Generate next 8 occurrences to check for conflicts
    const futureDates = [];
    let checkDate = new Date(startTime);
    
    for (let i = 0; i < 8; i++) {
      if (recurrence === 'weekly') {
        checkDate = addWeeks(checkDate, 1);
      } else if (recurrence === 'biweekly') {
        checkDate = addWeeks(checkDate, 2);
      } else if (recurrence === 'monthly') {
        checkDate = addMonths(checkDate, 1);
      }
      
      const futureStartTime = new Date(checkDate);
      futureStartTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
      
      const futureEndTime = new Date(futureStartTime);
      futureEndTime.setTime(futureEndTime.getTime() + (endTime.getTime() - startTime.getTime()));
      
      const result = await validateAppointmentSlot(providerId, futureStartTime, futureEndTime);
      if (result.hasConflict) {
        console.log(`Recurring conflict found on ${format(futureStartTime, 'dd/MM/yyyy')}`);
        return {
          hasConflict: true,
          conflictReason: `Conflicto en recurrencia futura (${format(futureStartTime, 'dd/MM/yyyy')})`,
          conflictDetails: {
            ...result.conflictDetails,
            futureDate: format(futureStartTime, 'dd/MM/yyyy')
          }
        };
      }
    }

    console.log('No recurring conflicts found');
    return { hasConflict: false };

  } catch (error) {
    console.error('Error checking recurring conflicts:', error);
    return { hasConflict: false };
  }
};