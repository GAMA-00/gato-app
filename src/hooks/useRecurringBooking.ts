
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

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
        
        // Mensajes de error más específicos
        if (error.code === '23505') {
          throw new Error('Ya existe una cita para este horario');
        } else if (error.code === '23503') {
          throw new Error('Error de referencia en los datos');
        } else {
          throw new Error(`Error de base de datos: ${error.message}`);
        }
      }

      if (!appointment) {
        console.error('No se recibió data de la cita creada');
        throw new Error('No se pudo crear la cita');
      }

      console.log('Cita creada exitosamente:', appointment);

      // Mostrar mensaje de éxito apropiado
      if (data.recurrenceType === 'once') {
        toast.success('¡Cita creada exitosamente!');
      } else {
        const recurrenceText = data.recurrenceType === 'weekly' ? 'semanal' : 
                               data.recurrenceType === 'biweekly' ? 'quincenal' : 'mensual';
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
      
      // Mostrar mensajes de error más específicos
      let errorMessage = 'Error al crear la cita';
      if (error.message) {
        errorMessage += ': ' + error.message;
      } else {
        errorMessage += ': Error desconocido';
      }
      
      toast.error(errorMessage);
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
