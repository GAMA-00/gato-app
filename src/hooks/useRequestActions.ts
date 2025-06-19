
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRequestActions = () => {
  const queryClient = useQueryClient();

  const handleAccept = async (request: any, onAcceptRequest?: (request: any) => void) => {
    try {
      console.log("Accepting request group:", request.id, "with appointments:", request.appointment_ids);
      
      // Update all appointments in the group
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .in('id', request.appointment_ids);
        
      if (error) throw error;
      
      const isGroup = request.appointment_count > 1;
      toast.success(isGroup 
        ? `Serie de reservas ${request.recurrence_label?.toLowerCase()} aceptada (${request.appointment_count} citas)`
        : "Solicitud aceptada"
      );
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] });
      
      if (onAcceptRequest) {
        onAcceptRequest(request);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleDecline = async (request: any, onDeclineRequest?: (requestId: string) => void) => {
    try {
      console.log("Declining request group:", request.id, "with appointments:", request.appointment_ids);
      
      // Update all appointments in the group
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'rejected' })
        .in('id', request.appointment_ids);
        
      if (error) throw error;
      
      const isGroup = request.appointment_count > 1;
      toast.success(isGroup 
        ? `Serie de reservas ${request.recurrence_label?.toLowerCase()} rechazada`
        : "Solicitud rechazada"
      );
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] });
      
      if (onDeclineRequest) {
        onDeclineRequest(request.id);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  return {
    handleAccept,
    handleDecline
  };
};
