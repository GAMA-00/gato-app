
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface RecurringBookingData {
  listingId: string;
  startTime: string;
  endTime: string;
  recurrenceType: string;
  notes?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  customVariableSelections?: any;
  customVariablesTotalPrice?: number;
}

export function useRecurringBooking() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createRecurringBooking = async (data: RecurringBookingData) => {
    console.log('=== INICIANDO CREACIÓN DE RESERVA RECURRENTE ===');
    console.log('Datos recibidos:', data);

    if (!user) {
      console.error('Usuario no autenticado');
      toast.error('Debe estar autenticado para crear una cita');
      return null;
    }

    console.log('Usuario autenticado:', { id: user.id, name: user.name });
    setIsLoading(true);

    try {
      // Validar datos requeridos
      if (!data.listingId || !data.startTime || !data.endTime) {
        throw new Error('Datos de reserva incompletos');
      }

      console.log('Obteniendo información del servicio...');
      // Obtener información del servicio
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('provider_id, title')
        .eq('id', data.listingId)
        .single();

      if (listingError) {
        console.error('Error al obtener listing:', listingError);
        throw new Error('Error al obtener información del servicio');
      }

      if (!listing) {
        console.error('Listing no encontrado para ID:', data.listingId);
        throw new Error('No se encontró el servicio');
      }

      console.log('Información del servicio obtenida:', listing);

      // Validar campos obligatorios
      if (!data.clientAddress) {
        console.error('Dirección del cliente faltante');
        throw new Error('La dirección del cliente es requerida');
      }

      if (!data.clientPhone && !data.clientEmail) {
        console.error('Información de contacto faltante');
        throw new Error('Se requiere al menos teléfono o email');
      }

      // Verificar disponibilidad del slot antes de crear la cita
      const slotDateStr = format(new Date(data.startTime), 'yyyy-MM-dd');
      const slotTimeStr = format(new Date(data.startTime), 'HH:mm');
      
      console.log('=== VERIFICANDO DISPONIBILIDAD DEL SLOT ===');
      console.log('Slot solicitado:', { slotDateStr, slotTimeStr, providerId: listing.provider_id, listingId: data.listingId });
      console.log('Tipo de recurrencia:', data.recurrenceType);
      console.log('Start time exacto:', data.startTime);
      
      // Validar que el slot es válido para la recurrencia seleccionada
      if (data.recurrenceType && data.recurrenceType !== 'once') {
        console.log('🔄 Validando slot para recurrencia:', data.recurrenceType);
        
        const { shouldHaveRecurrenceOn } = await import('@/utils/optimizedRecurrenceSystem');
        const normalizeRecurrenceType = (recurrence: string): 'once' | 'weekly' | 'biweekly' | 'triweekly' | 'monthly' => {
          switch (recurrence?.toLowerCase()) {
            case 'weekly': return 'weekly';
            case 'biweekly': return 'biweekly';  
            case 'triweekly': return 'triweekly';
            case 'monthly': return 'monthly';
            default: return 'once';
          }
        };
        
        const config = {
          type: normalizeRecurrenceType(data.recurrenceType),
          startDate: new Date(data.startTime)
        };
        
        const isValidForRecurrence = shouldHaveRecurrenceOn(new Date(data.startTime), config);
        
        if (!isValidForRecurrence) {
          console.log('❌ Slot no válido para la recurrencia seleccionada');
          throw new Error(`Este horario no es válido para una cita ${data.recurrenceType}. Por favor selecciona un horario diferente.`);
        }
        
        console.log('✅ Slot validado correctamente para recurrencia');
      }
      
      // Solo verificar si ya existe una cita confirmada o pendiente para este slot exacto
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id, status, recurrence, start_time, end_time, client_id')
        .eq('provider_id', listing.provider_id)
        .eq('start_time', data.startTime)
        .in('status', ['confirmed', 'pending']);

      if (checkError) {
        console.error('Error checking slot availability:', checkError);
        throw new Error('Error verificando disponibilidad del horario');
      }

      console.log('Citas existentes encontradas:', existingAppointments);

      if (existingAppointments && existingAppointments.length > 0) {
        // Verificar si alguna de estas citas es del mismo cliente (podrían ser duplicadas por error)
        const otherClientsAppointments = existingAppointments.filter(apt => apt.client_id !== user.id);
        
        if (otherClientsAppointments.length > 0) {
          console.log('❌ Slot ya ocupado por otros clientes:', otherClientsAppointments);
          throw new Error('Este horario ya fue reservado por otro cliente. Por favor selecciona un horario diferente.');
        }
        
        // Si todas las citas son del mismo cliente, podría ser un intento duplicado
        console.log('⚠️ Encontradas citas del mismo cliente para este horario:', existingAppointments);
        throw new Error('Ya tienes una cita para este horario. Revisa tu lista de citas.');
      }

      console.log('✅ Slot disponible, procediendo con la creación de la cita...');

      // Crear la cita directamente en appointments con el campo recurrence
      const appointmentData = {
        listing_id: data.listingId,
        client_id: user.id,
        provider_id: listing.provider_id,
        start_time: data.startTime,
        end_time: data.endTime,
        status: 'pending',
        notes: data.notes || '',
        client_address: data.clientAddress,
        client_phone: data.clientPhone,
        client_email: data.clientEmail,
        client_name: user.name || 'Cliente',
        recurrence: data.recurrenceType,
        external_booking: false,
        is_recurring_instance: false, // Base appointment, not an instance
        custom_variable_selections: data.customVariableSelections ? JSON.stringify(data.customVariableSelections) : null,
        custom_variables_total_price: data.customVariablesTotalPrice || 0
      };

      console.log('Datos de cita preparados:', appointmentData);
      console.log('Insertando cita en base de datos...');

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        
        // Enhanced error handling with more specific messages
        if (error.code === '23505') {
          // This should be very rare now due to our database constraint changes
          if (error.message?.includes('unique_active_appointment_slot')) {
            throw new Error('Ya existe una cita activa para este horario. Selecciona otro horario.');
          }
          throw new Error('Este horario ya fue reservado mientras procesábamos tu solicitud. Por favor selecciona otro horario.');
        } else if (error.code === '23503') {
          throw new Error('Error de referencia en los datos');
        } else if (error.code === '23514') {
          throw new Error('Los datos no cumplen con los requisitos');
        } else if (error.code === 'P0001') {
          // Custom database function error
          throw new Error('Este horario ya fue reservado. Por favor selecciona un horario diferente.');
        } else {
          throw new Error(`Error de base de datos: ${error.message}`);
        }
      }

      if (!appointment) {
        console.error('No se recibió data de la cita creada');
        throw new Error('No se pudo crear la cita');
      }

      console.log('Cita creada exitosamente:', appointment);

      // Generate future recurring instances asynchronously (don't block main booking)
      if (data.recurrenceType !== 'once' && appointment.id) {
        console.log('Scheduling future recurring instances for appointment:', appointment.id);
        
      }

      console.log('Cita creada exitosamente:', appointment);

      // Mostrar mensaje de éxito apropiado
      if (data.recurrenceType === 'once') {
        toast.success('¡Cita creada exitosamente!');
      } else {
        const recurrenceText = data.recurrenceType === 'weekly' ? 'semanal' : 
                               data.recurrenceType === 'biweekly' ? 'quincenal' : 
                               data.recurrenceType === 'triweekly' ? 'trisemanal' : 'mensual';
        toast.success(`¡Servicio recurrente ${recurrenceText} creado exitosamente!`);
      }

      console.log('Invalidando queries para actualizar UI...');
      // Invalidar queries para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ['unified-calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['client-bookings'] });

      console.log('=== RESERVA CREADA EXITOSAMENTE ===');
      return appointment;
      
    } catch (error: any) {
      console.error('=== ERROR EN CREACIÓN DE RESERVA ===');
      console.error('Error details:', error);
      
      // Enhanced error messages based on new database constraint logic
      let errorMessage = 'No se pudo crear la cita';
      
      if (error?.code === '23505') {
        if (error.message?.includes('unique_active_appointment_slot')) {
          errorMessage = 'Ya existe una cita activa para este horario. Por favor selecciona otro.';
        } else {
          errorMessage = 'Ya existe una cita para este horario. Por favor selecciona otro.';
        }
      } else if (error?.code === '23503') {
        errorMessage = 'Error en los datos de la cita. Por favor intenta de nuevo.';
      } else if (error?.code === '23514') {
        errorMessage = 'Los datos no cumplen con los requisitos del sistema.';
      } else if (error?.message?.includes('timeout')) {
        errorMessage = 'El proceso está tardando. Tu cita podría haberse creado. Revisa tu lista de citas.';
      } else if (error?.message?.includes('network')) {
        errorMessage = 'Error de conexión. Por favor verifica tu internet e intenta de nuevo.';
      } else if (error?.message?.includes('unique_active_appointment_slot')) {
        errorMessage = 'Este horario ya está reservado. Las citas canceladas han sido liberadas automáticamente.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage, {
        duration: 5000,
        action: {
          label: 'Ver mis citas',
          onClick: () => window.location.href = '/client/bookings'
        }
      });
      return null;
    } finally {
      console.log('Finalizando proceso de creación...');
      setIsLoading(false);
    }
  };

  return {
    createRecurringBooking,
    isLoading
  };
}
