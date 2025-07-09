
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRequestActions = () => {
  const queryClient = useQueryClient();

  const handleAccept = async (request: any, onAcceptRequest?: (request: any) => void) => {
    try {
      console.log("=== ACCEPT BUTTON CLICKED ===");
      console.log("Full request object:", request);
      console.log("Request ID:", request.id);
      console.log("Appointment IDs:", request.appointment_ids);
      console.log("Appointment count:", request.appointment_count);
      
      // Check if appointment_ids exists and is valid
      if (!request.appointment_ids || !Array.isArray(request.appointment_ids) || request.appointment_ids.length === 0) {
        console.error("Invalid appointment_ids:", request.appointment_ids);
        throw new Error("No hay IDs de citas válidos para procesar");
      }

      console.log("Updating appointments with IDs:", request.appointment_ids);
      
      // First, let's verify the appointments exist and we can access them
      const { data: existingAppointments, error: selectError } = await supabase
        .from('appointments')
        .select('id, status, provider_id')
        .in('id', request.appointment_ids);
        
      console.log("Existing appointments check:", existingAppointments);
      if (selectError) {
        console.error("Error checking existing appointments:", selectError);
        throw new Error(`Error verificando citas: ${selectError.message}`);
      }
      
      if (!existingAppointments || existingAppointments.length === 0) {
        throw new Error("No se encontraron las citas para actualizar");
      }
      
      // Update all appointments in the group
      const { data: updatedData, error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .in('id', request.appointment_ids)
        .select();
        
      console.log("Update result:", updatedData);
      if (error) {
        console.error("Update error details:", error);
        throw error;
      }
      
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
