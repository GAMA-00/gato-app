
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
    console.log(`=== INICIANDO VALIDACIÓN DE SLOT ===`);
    console.log(`Provider: ${providerId}`);
    console.log(`Horario: ${startTime.toISOString()} - ${endTime.toISOString()}`);
    console.log(`Recurrencia: ${recurrence}`);
    
    // Enhanced validation - check only ACTIVE appointments, ignore cancelled ones
    console.log('Validando slot inmediato contra citas activas...');
    const slotValidation = await validateAppointmentSlot(providerId, startTime, endTime, excludeAppointmentId);
    
    if (slotValidation.hasConflict) {
      console.error('Conflicto detectado en slot inmediato:', slotValidation);
      
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
      
      console.error('Mensaje de error:', errorMessage);
      toast.error(errorMessage, {
        duration: 2000,
        style: {
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626'
        }
      });
      return false;
    }

    console.log('✅ Slot inmediato validado correctamente - sin conflictos activos');

    // Then check recurring conflicts if applicable
    if (recurrence !== 'once' && recurrence !== 'none') {
      console.log('Validando conflictos de recurrencia...');
      const recurringValidation = await checkRecurringConflicts(providerId, startTime, endTime, recurrence);
      
      if (recurringValidation.hasConflict) {
        console.error('Conflicto detectado en recurrencia:', recurringValidation);
        const errorMessage = recurringValidation.conflictReason || 'Conflicto en fechas futuras de la recurrencia';
        toast.error(errorMessage, {
          duration: 3000,
          style: {
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626'
          }
        });
        return false;
      }
      
      console.log('✅ Recurrencia validada correctamente');
    }

    console.log(`=== VALIDACIÓN COMPLETADA EXITOSAMENTE ===`);
    return true;
  } catch (error) {
    console.error('=== ERROR EN VALIDACIÓN DE SLOT ===');
    console.error('Error details:', error);
    toast.error('Error al validar la disponibilidad. Intenta de nuevo.', {
      duration: 3000,
      style: {
        background: '#fee2e2',
        border: '1px solid #fecaca',
        color: '#dc2626'
      }
    });
    return false;
  }
};
