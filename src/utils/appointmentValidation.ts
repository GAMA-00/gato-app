
import { supabase } from '@/integrations/supabase/client';
import { isSameDay, format, addWeeks, addDays, addMonths } from 'date-fns';

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
    console.log(`Validating unified availability for provider ${providerId}: ${format(startTime, 'yyyy-MM-dd HH:mm')} - ${format(endTime, 'yyyy-MM-dd HH:mm')}`);

    // CORRECTED QUERY: Get ALL appointments for this provider to check for overlaps
    let query = supabase
      .from('appointments')
      .select('id, start_time, end_time, client_name, status, external_booking, listing_id, recurrence')
      .eq('provider_id', providerId)
      .in('status', ['pending', 'confirmed', 'completed', 'scheduled']);

    // Exclude specific appointment if provided (for rescheduling)
    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }

    const { data: allAppointments, error: appointmentsError } = await query;

    if (appointmentsError) {
      console.error('Error checking provider appointments:', appointmentsError);
      return { hasConflict: false }; // Don't block on error, just log
    }

    console.log(`Found ${allAppointments?.length || 0} total appointments to check for provider ${providerId}`);

    // Check for conflicts with ALL appointments (internal, external, recurring)
    if (allAppointments) {
      for (const appointment of allAppointments) {
        const appointmentStart = new Date(appointment.start_time);
        const appointmentEnd = new Date(appointment.end_time);
        
        // Check if times overlap
        if (startTime < appointmentEnd && endTime > appointmentStart) {
          console.log(`Conflict found with ${appointment.external_booking ? 'external' : 'internal'} appointment ${appointment.id}`);
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


    console.log('No conflicts found - slot is available');
    return { hasConflict: false };

  } catch (error) {
    console.error('Error in validateAppointmentSlot:', error);
    return { hasConflict: false }; // Don't block on error, allow booking
  }
};

export const checkRecurringConflicts = async (
  providerId: string,
  startTime: Date,
  endTime: Date,
  recurrence: string
): Promise<ConflictCheckResult> => {
  if (recurrence === 'once') {
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
    return { hasConflict: false }; // Don't block on error
  }
};
