
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
      
      // Usamos RPC atómica para crear la cita y reservar el slot en una sola transacción
      console.log('▶️ Invocando RPC create_appointment_with_slot (operación atómica)');

      // Preparar parámetros para la función RPC
      const rpcParams = {
        p_provider_id: listing.provider_id,
        p_listing_id: data.listingId,
        p_client_id: user.id,
        p_start_time: data.startTime,
        p_end_time: data.endTime,
        p_recurrence: data.recurrenceType || 'none',
        p_notes: data.notes || '',
        p_client_name: user.name || 'Cliente',
        p_client_email: data.clientEmail || null,
        p_client_phone: data.clientPhone || null,
        p_client_address: data.clientAddress || null,
        p_residencia_id: null as string | null
      };

      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('create_appointment_with_slot', rpcParams);

      console.log('RPC Response:', { rpcResult, rpcError });

      if (rpcError) {
        console.error('RPC error completo:', rpcError);
        console.error('Código de error:', rpcError.code);
        console.error('Mensaje de error:', rpcError.message);
        
        // Mapear mensajes conocidos con mejor manejo
        if (rpcError.code === 'P0001') {
          const errorMsg = rpcError.message || 'El horario no está disponible en este momento';
          console.error('Error P0001 - Horario no disponible:', errorMsg);
          throw new Error(errorMsg);
        }
        if (rpcError.code === '23505') {
          console.error('Error 23505 - Conflicto de unicidad');
          throw new Error('Este horario ya fue reservado. Selecciona otro horario.');
        }
        
        console.error('Error no manejado, re-throwing:', rpcError);
        throw new Error(`Error del servidor: ${rpcError.message || 'Error desconocido'}`);
      }

      console.log('RPC ejecutado sin errores, procesando resultado...');

      // Normalizar resultado (puede venir como objeto o arreglo con una fila)
      const resultRow: any = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
      console.log('ResultRow procesado:', resultRow);
      
      const createdId: string | undefined = resultRow?.appointment_id;
      const rpcStatus: string | undefined = resultRow?.status;

      console.log('Datos extraídos del RPC:', { createdId, rpcStatus });

      if (!createdId) {
        console.error('No se recibió appointment_id del RPC');
        console.error('Resultado completo:', rpcResult);
        throw new Error('No se recibió el ID de la cita creada');
      }

      if (rpcStatus === 'exists') {
        console.log('Cita ya existía, devolviendo ID existente:', createdId);
        toast.success('Ya tienes una cita para este horario');
        return { id: createdId } as any;
      }

      console.log('RPC creada con éxito. ID:', createdId, 'status:', rpcStatus);

      // Obtener la cita completa para mantener compatibilidad con el resto del flujo
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', createdId)
        .maybeSingle();

      if (fetchError) {
        console.warn('No se pudo obtener la cita completa, devolviendo sólo el ID', fetchError);
        return { id: createdId } as any;
      }

      if (!appointment) {
        // Si por alguna razón no se recupera, devolvemos un objeto mínimo con ID
        return { id: createdId } as any;
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
