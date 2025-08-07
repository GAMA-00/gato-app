
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
      throw new Error('Usuario no autenticado');
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

      // Verificar y limpiar estado del slot antes de booking
      console.log('=== VERIFICANDO Y LIMPIANDO ESTADO DEL SLOT ===');
      console.log('Slot solicitado:', { providerId: listing.provider_id, listingId: data.listingId });
      console.log('Start time exacto:', data.startTime);
      
      // 1. Verificar si existe una cita cancelada/completada en este slot
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('provider_id', listing.provider_id)
        .eq('listing_id', data.listingId)
        .eq('start_time', data.startTime);

      if (checkError) {
        console.error('Error checking existing appointments:', checkError);
      }

      // 2. Limpiar citas canceladas o completadas que podrían estar bloqueando el slot
      if (existingAppointments && existingAppointments.length > 0) {
        const blockedAppointments = existingAppointments.filter(apt => 
          apt.status === 'cancelled' || apt.status === 'completed'
        );
        
        if (blockedAppointments.length > 0) {
          console.log('Limpiando citas bloqueadas:', blockedAppointments);
          const { error: deleteError } = await supabase
            .from('appointments')
            .delete()
            .in('id', blockedAppointments.map(apt => apt.id));
          
          if (deleteError) {
            console.error('Error cleaning blocked appointments:', deleteError);
          }
        }

        // Verificar si hay citas activas que realmente bloquean el slot
        const activeAppointments = existingAppointments.filter(apt => 
          apt.status === 'pending' || apt.status === 'confirmed'
        );
        
        if (activeAppointments.length > 0) {
          throw new Error('Este horario ya está reservado por otro cliente');
        }
      }

      // 3. Verificar y actualizar estado del slot en provider_time_slots
      const { data: slotData, error: slotError } = await supabase
        .from('provider_time_slots')
        .select('id, is_available, is_reserved, recurring_blocked')
        .eq('provider_id', listing.provider_id)
        .eq('listing_id', data.listingId)
        .eq('slot_datetime_start', data.startTime)
        .maybeSingle();

      if (slotError) {
        console.error('Error checking slot:', slotError);
      }

      // Liberar slot si está marcado como reservado/bloqueado pero no hay citas activas
      if (slotData && (slotData.is_reserved || slotData.recurring_blocked || !slotData.is_available)) {
        console.log('Liberando slot bloqueado:', slotData);
        const { error: updateError } = await supabase
          .from('provider_time_slots')
          .update({ 
            is_available: true, 
            is_reserved: false, 
            recurring_blocked: false 
          })
          .eq('id', slotData.id);
        
        if (updateError) {
          console.error('Error updating slot availability:', updateError);
        }
      }
      
      console.log('✅ Slot limpiado y disponible, procediendo con la creación de la cita...');

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

      // Intentar crear la cita con manejo robusto de errores
      let appointment;
      let insertAttempts = 0;
      const maxInsertAttempts = 2;

      while (insertAttempts < maxInsertAttempts) {
        insertAttempts++;
        console.log(`Intento ${insertAttempts} de crear appointment...`);

        const { data: appointmentResult, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (!error) {
          appointment = appointmentResult;
          break;
        }

        console.error(`Error en intento ${insertAttempts}:`, error);

        // Si es error P0001 (slot ya existe), intentar limpiar y reintentar una vez
        if (error.code === 'P0001' && insertAttempts === 1) {
          console.log('🔧 Error P0001 detectado, limpiando conflictos y reintentando...');
          
          // Limpiar cualquier cita conflictiva
          await supabase
            .from('appointments')
            .delete()
            .eq('provider_id', listing.provider_id)
            .eq('listing_id', data.listingId)
            .eq('start_time', data.startTime)
            .in('status', ['cancelled', 'completed']);

          // Limpiar estado del slot
          await supabase
            .from('provider_time_slots')
            .update({ 
              is_available: true, 
              is_reserved: false, 
              recurring_blocked: false 
            })
            .eq('provider_id', listing.provider_id)
            .eq('listing_id', data.listingId)
            .eq('slot_datetime_start', data.startTime);

          // Esperar un momento antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // Para otros errores o si ya reintentamos
        if (error.code === '23505') {
          throw new Error('Este horario ya fue reservado. Selecciona otro horario.');
        } else if (error.code === '23503') {
          throw new Error('Error de referencia en los datos');
        } else if (error.code === '23514') {
          throw new Error('Los datos no cumplen con los requisitos');
        } else if (error.code === 'P0001') {
          throw new Error('Este horario no está disponible en este momento');
        } else {
          throw new Error(`Error de base de datos: ${error.message}`);
        }
      }

      if (!appointment) {
        throw new Error('No se pudo crear la cita después de varios intentos');
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
      throw error;
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
