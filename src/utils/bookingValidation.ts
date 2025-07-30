
import { validateAppointmentSlot } from './appointmentValidation';
import { checkRecurringConflicts } from './simplifiedRecurrenceUtils';
import { supabase } from '@/integrations/supabase/client';
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

    // Optimistic validation for recurring conflicts 
    if (recurrence !== 'once' && recurrence !== 'none') {
      console.log('⚡ Validación optimista de recurrencia - permitiendo reserva...');
      
      // For better UX, we do a lightweight check but don't block the booking
      // The comprehensive validation will happen at the database level
      try {
        const { data: hasBasicConflict } = await supabase
          .rpc('check_recurring_availability', {
            p_provider_id: providerId,
            p_start_time: startTime.toISOString(),
            p_end_time: endTime.toISOString()
          });

        if (!hasBasicConflict) {
          console.log('⚠️ Posible conflicto recurrente detectado, pero permitiendo continuar');
          toast.warning('Verificando disponibilidad recurrente...', {
            duration: 2000,
            style: {
              background: '#fef3c7',
              border: '1px solid #fde68a',
              color: '#d97706'
            }
          });
        }
      } catch (error) {
        console.log('Error en validación optimista, continuando:', error);
      }
      
      console.log('✅ Validación optimista completada');
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
