
import { validateAppointmentSlot, checkRecurringConflicts } from './appointmentValidation';
import { toast } from 'sonner';

export const validateBookingSlot = async (
  providerId: string,
  startTime: Date,
  endTime: Date,
  recurrence: string = 'once',
  excludeAppointmentId?: string
): Promise<boolean> => {
  try {
    console.log(`Validating unified booking slot for provider ${providerId}`);
    
    // First check the immediate slot against ALL provider appointments and blocks
    const slotValidation = await validateAppointmentSlot(providerId, startTime, endTime, excludeAppointmentId);
    
    if (slotValidation.hasConflict) {
      // Provide specific error message based on conflict type
      const { conflictDetails } = slotValidation;
      let errorMessage = slotValidation.conflictReason || 'Este horario no está disponible';
      
      if (conflictDetails?.type === 'external') {
        errorMessage = 'Este horario tiene una cita externa confirmada';
      } else if (conflictDetails?.type === 'internal') {
        errorMessage = conflictDetails.isRecurring 
          ? 'Este horario tiene una cita recurrente confirmada'
          : 'Este horario ya tiene una cita confirmada';
      } else if (conflictDetails?.type === 'blocked') {
        errorMessage = `Horario bloqueado: ${conflictDetails.note || 'No disponible'}`;
      }
      
      toast.error(errorMessage);
      return false;
    }

    // Then check recurring conflicts if applicable
    if (recurrence !== 'once' && recurrence !== 'none') {
      const recurringValidation = await checkRecurringConflicts(providerId, startTime, endTime, recurrence);
      
      if (recurringValidation.hasConflict) {
        const errorMessage = recurringValidation.conflictReason || 'Conflicto en fechas futuras de la recurrencia';
        toast.error(errorMessage);
        return false;
      }
    }

    console.log(`Booking slot validated successfully for provider ${providerId}`);
    return true;
  } catch (error) {
    console.error('Error validating unified booking slot:', error);
    toast.error('Error al validar la disponibilidad. Intenta de nuevo.');
    return false;
  }
};
