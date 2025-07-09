import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRequestActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleAccept = async (request: any, onAcceptRequest?: (request: any) => void) => {
    try {
      // Validate appointment IDs
      if (!request.appointment_ids || !Array.isArray(request.appointment_ids) || request.appointment_ids.length === 0) {
        console.error("Invalid appointment_ids:", request.appointment_ids);
        toast.error("Error: No hay citas válidas para procesar");
        return;
      }

      // Update appointments status to confirmed
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          last_modified_at: new Date().toISOString(),
          last_modified_by: user?.id
        })
        .in('id', request.appointment_ids)
        .select('id, status');
        
      if (error) {
        console.error("Update error:", error);
        toast.error(`Error al aceptar la solicitud: ${error.message}`);
        return;
      }

      const isGroup = request.appointment_count > 1;
      toast.success(isGroup 
        ? `Serie de reservas ${request.recurrence_label?.toLowerCase()} aceptada (${request.appointment_count} citas)`
        : "Solicitud aceptada correctamente"
      );
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] });
      
      // Call callback if provided
      if (onAcceptRequest) {
        onAcceptRequest(request);
      }
      
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error(`Error inesperado: ${error.message}`);
    }
  };

  const handleDecline = async (request: any, onDeclineRequest?: (requestId: string) => void) => {
    try {
      console.log("Declining request group:", request.id, "with appointments:", request.appointment_ids);
      
      // Validate appointment IDs
      if (!request.appointment_ids || !Array.isArray(request.appointment_ids) || request.appointment_ids.length === 0) {
        console.error("Invalid appointment_ids:", request.appointment_ids);
        toast.error("Error: No hay citas válidas para rechazar");
        return;
      }
      
      // Update all appointments in the group
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'rejected',
          last_modified_at: new Date().toISOString(),
          last_modified_by: user?.id
        })
        .in('id', request.appointment_ids)
        .select('id, status');
        
      if (error) {
        console.error("Decline error:", error);
        toast.error(`Error al rechazar la solicitud: ${error.message}`);
        return;
      }
      
      console.log("Successfully declined appointments:", data);
      
      const isGroup = request.appointment_count > 1;
      toast.success(isGroup 
        ? `Serie de reservas ${request.recurrence_label?.toLowerCase()} rechazada`
        : "Solicitud rechazada correctamente"
      );
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] });
      
      if (onDeclineRequest) {
        onDeclineRequest(request.id);
      }
    } catch (error: any) {
      console.error("Unexpected decline error:", error);
      toast.error(`Error inesperado: ${error.message}`);
    }
  };

  return {
    handleAccept,
    handleDecline
  };
};