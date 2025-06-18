
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
    console.log(`Validating slot: ${format(startTime, 'yyyy-MM-dd HH:mm')} - ${format(endTime, 'yyyy-MM-dd HH:mm')}`);

    // Check regular appointments
    const { data: regularAppointments, error: regularError } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, client_name, status')
      .eq('provider_id', providerId)
      .in('status', ['pending', 'confirmed', 'completed'])
      .neq('id', excludeAppointmentId || '');

    if (regularError) {
      console.error('Error checking regular appointments:', regularError);
      return { hasConflict: true, conflictReason: 'Error validating availability' };
    }

    // Check for conflicts with regular appointments
    if (regularAppointments) {
      for (const appointment of regularAppointments) {
        const appointmentStart = new Date(appointment.start_time);
        const appointmentEnd = new Date(appointment.end_time);
        
        if (startTime < appointmentEnd && endTime > appointmentStart) {
          return {
            hasConflict: true,
            conflictReason: 'Conflicto con cita existente',
            conflictDetails: {
              type: 'regular',
              appointment: appointment,
              time: `${format(appointmentStart, 'HH:mm')} - ${format(appointmentEnd, 'HH:mm')}`
            }
          };
        }
      }
    }

    // Check blocked time slots
    const dayOfWeek = startTime.getDay();
    const startHour = startTime.getHours();
    const endHour = endTime.getHours() + (endTime.getMinutes() > 0 ? 1 : 0);

    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_time_slots')
      .select('start_hour, end_hour, note')
      .eq('provider_id', providerId)
      .or(`day.eq.${dayOfWeek},day.eq.-1`);

    if (blockedError) {
      console.error('Error checking blocked slots:', blockedError);
      return { hasConflict: true, conflictReason: 'Error validating blocked slots' };
    }

    if (blockedSlots) {
      for (const blocked of blockedSlots) {
        if (startHour < blocked.end_hour && endHour > blocked.start_hour) {
          return {
            hasConflict: true,
            conflictReason: 'Horario bloqueado por el proveedor',
            conflictDetails: {
              type: 'blocked',
              note: blocked.note,
              time: `${blocked.start_hour}:00 - ${blocked.end_hour}:00`
            }
          };
        }
      }
    }

    console.log('No conflicts found - slot is available');
    return { hasConflict: false };

  } catch (error) {
    console.error('Error in validateAppointmentSlot:', error);
    return { hasConflict: true, conflictReason: 'Error inesperado al validar disponibilidad' };
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

    return { hasConflict: false };

  } catch (error) {
    console.error('Error checking recurring conflicts:', error);
    return { hasConflict: true, conflictReason: 'Error al validar recurrencia' };
  }
};
