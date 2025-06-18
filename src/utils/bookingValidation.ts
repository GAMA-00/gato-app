
import { validateAppointmentSlot, checkRecurringConflicts } from './appointmentValidation';
import { toast } from 'sonner';

export const validateBookingSlot = async (
  providerId: string,
  startTime: Date,
  endTime: Date,
  recurrence: string = 'once'
): Promise<boolean> => {
  try {
    // First check the immediate slot
    const slotValidation = await validateAppointmentSlot(providerId, startTime, endTime);
    
    if (slotValidation.hasConflict) {
      toast.error(slotValidation.conflictReason || 'Este horario no está disponible');
      return false;
    }

    // Then check recurring conflicts if applicable
    if (recurrence !== 'once') {
      const recurringValidation = await checkRecurringConflicts(providerId, startTime, endTime, recurrence);
      
      if (recurringValidation.hasConflict) {
        toast.error(recurringValidation.conflictReason || 'Conflicto en fechas futuras de la recurrencia');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error validating booking slot:', error);
    toast.error('Error al validar la disponibilidad. Intenta de nuevo.');
    return false;
  }
};
