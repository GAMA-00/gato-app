import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { blockRejectedSlots, extractRejectedSlotData } from '@/utils/rejectedSlotUtils';

export const useRequestActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async (request: any, onAcceptRequest?: (request: any) => void) => {
    if (isLoading) return;
    
    if (!user?.id) {
      toast.error("Error: Usuario no autenticado");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Validate appointment IDs
      if (!request.appointment_ids || !Array.isArray(request.appointment_ids) || request.appointment_ids.length === 0) {
        throw new Error("No hay citas válidas para procesar");
      }

      // Update appointments status to confirmed with better error handling
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          last_modified_at: new Date().toISOString(),
          last_modified_by: user.id
        })
        .in('id', request.appointment_ids)
        .select('id, status, recurrence, client_name, provider_name');
        
      if (error) {
        // Handle specific database errors
        if (error.code === '23505') {
          throw new Error("Ya existe una cita confirmada para este horario");
        } else if (error.code === '23503') {
          throw new Error("Error de referencia de datos. Verifica que todos los datos sean válidos.");
        } else if (error.message.includes('violates row-level security')) {
          throw new Error("No tienes permisos para realizar esta acción");
        } else if (error.code === '42883') {
          // Function does not exist error - the database function might be broken
          console.warn("Database function error detected, proceeding anyway:", error.message);
        } else {
          throw new Error(`Error de base de datos: ${error.message}`);
        }
      }

      if (!data || data.length === 0) {
        throw new Error("No se pudieron actualizar las citas. Verifica que existan.");
      }

      // ✅ NUEVO: Capturar pagos prepago inmediatamente cuando proveedor acepta
      console.log('💰 Capturando pagos prepago para citas aceptadas...');
      try {
        const { data: captureResult, error: captureError } = await supabase.functions.invoke(
          'onvopay-capture-on-provider-accept',
          {
            body: { appointmentIds: request.appointment_ids }
          }
        );

        if (captureError) {
          console.error('⚠️ Error capturando pagos (no crítico - puede ser postpago):', captureError);
          // NO bloquear el flujo, solo loguear
        } else {
          console.log('✅ Resultado de capturas prepago:', captureResult);
        }
      } catch (captureError) {
        console.error('⚠️ Exception capturando pagos (no crítico):', captureError);
        // Continuar flujo normal - algunos pagos pueden ser postpago
      }

      const isGroup = request.appointment_count > 1;
      const successMessage = isGroup 
        ? `Serie de reservas ${request.recurrence_label?.toLowerCase()} aceptada (${request.appointment_count} citas)`
        : "Solicitud aceptada correctamente";
      
      toast.success(successMessage);
      
      // Invalidate queries to refresh the UI
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-recurring-system'] }),
        queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
      ]);
      
      // Call callback if provided
      if (onAcceptRequest) {
        onAcceptRequest(request);
      }
      
    } catch (error: any) {
      console.error("Error accepting appointment:", error);
      const errorMessage = error.message || "Error al aceptar la solicitud. Intenta de nuevo.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async (request: any, onDeclineRequest?: (requestId: string) => void) => {
    if (isLoading) return;
    
    if (!user?.id) {
      toast.error("Error: Usuario no autenticado");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Validate appointment IDs
      if (!request.appointment_ids || !Array.isArray(request.appointment_ids) || request.appointment_ids.length === 0) {
        throw new Error("No hay citas válidas para rechazar");
      }
      
      // First, get full appointment details before updating
      const { data: appointmentDetails, error: fetchError } = await supabase
        .from('appointments')
        .select('id, provider_id, listing_id, start_time, end_time, recurrence, status, client_name, provider_name')
        .in('id', request.appointment_ids);

      if (fetchError) {
        throw new Error(`Error obteniendo detalles de citas: ${fetchError.message}`);
      }

      if (!appointmentDetails || appointmentDetails.length === 0) {
        throw new Error("No se encontraron las citas para rechazar");
      }

      // Update all appointments in the group
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'rejected',
          last_modified_at: new Date().toISOString(),
          last_modified_by: user.id
        })
        .in('id', request.appointment_ids)
        .select('id, status, client_name, provider_name');
        
      if (error) {
        throw new Error(`Error al rechazar la solicitud: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No se pudieron rechazar las citas. Verifica que existan.");
      }

      // Block the corresponding time slots for rejected appointments
      try {
        const slotsToBlock = extractRejectedSlotData(appointmentDetails);
        await blockRejectedSlots(slotsToBlock);
        console.log(`🚫 Blocked slots for ${slotsToBlock.length} rejected appointments`);
      } catch (slotError) {
        console.error("Error blocking rejected slots:", slotError);
        // Don't fail the entire operation if slot blocking fails
        toast.warning("Citas rechazadas correctamente, pero hubo un problema bloqueando los horarios");
      }
      
      const isGroup = request.appointment_count > 1;
      const successMessage = isGroup 
        ? `Serie de reservas ${request.recurrence_label?.toLowerCase()} rechazada - Horarios bloqueados`
        : "Solicitud rechazada correctamente - Horario bloqueado";
      
      toast.success(successMessage);
      
      // Invalidate queries to refresh the UI including time slots
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-recurring-system'] }),
        queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-time-slots'] })
      ]);
      
      if (onDeclineRequest) {
        onDeclineRequest(request.id);
      }
      
    } catch (error: any) {
      console.error("Error declining appointment:", error);
      const errorMessage = error.message || "Error al rechazar la solicitud. Intenta de nuevo.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleAccept,
    handleDecline,
    isLoading
  };
};