import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export const useRequestActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async (request: any, onAcceptRequest?: (request: any) => void) => {
    console.log("🟢 ACCEPT: Starting handleAccept with request:", request);
    console.log("🟢 ACCEPT: User:", user?.id, user?.role);
    
    if (isLoading) {
      console.log("🟡 ACCEPT: Already processing, ignoring");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Validate appointment IDs
      if (!request.appointment_ids || !Array.isArray(request.appointment_ids) || request.appointment_ids.length === 0) {
        console.error("🔴 ACCEPT: Invalid appointment_ids:", request.appointment_ids);
        toast.error("Error: No hay citas válidas para procesar");
        setIsLoading(false);
        return;
      }

      console.log("🟢 ACCEPT: Updating appointments to confirmed:", request.appointment_ids);
      
      // Update appointments status to confirmed
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          last_modified_at: new Date().toISOString(),
          last_modified_by: user?.id
        })
        .in('id', request.appointment_ids)
        .select('id, status, recurrence, client_name, provider_name');
        
      if (error) {
        console.error("🔴 ACCEPT: Database update error:", error);
        console.error("🔴 ACCEPT: Error details:", error.message, error.code, error.details);
        toast.error(`Error al aceptar la solicitud: ${error.message}`);
        setIsLoading(false);
        return;
      }

      console.log("✅ ACCEPT: Database update successful:", data);

      const isGroup = request.appointment_count > 1;
      const successMessage = isGroup 
        ? `Serie de reservas ${request.recurrence_label?.toLowerCase()} aceptada (${request.appointment_count} citas)`
        : "Solicitud aceptada correctamente";
      
      console.log("✅ ACCEPT: Showing success message:", successMessage);
      toast.success(successMessage);
      
      // Invalidate queries to refresh the UI
      console.log("🔄 ACCEPT: Invalidating queries for UI refresh");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-recurring-system'] }),
        queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
      ]);
      
      console.log("✅ ACCEPT: Queries invalidated successfully");
      
      // Call callback if provided
      if (onAcceptRequest) {
        console.log("🔄 ACCEPT: Calling onAcceptRequest callback");
        onAcceptRequest(request);
      }
      
      console.log("✅ ACCEPT: Process completed successfully");
      
    } catch (error: any) {
      console.error("🔴 ACCEPT: Unexpected error:", error);
      console.error("🔴 ACCEPT: Error stack:", error.stack);
      toast.error(`Error inesperado: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async (request: any, onDeclineRequest?: (requestId: string) => void) => {
    console.log("🔴 DECLINE: Starting handleDecline with request:", request);
    console.log("🔴 DECLINE: User:", user?.id, user?.role);
    
    if (isLoading) {
      console.log("🟡 DECLINE: Already processing, ignoring");
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("🔴 DECLINE: Declining request group:", request.id, "with appointments:", request.appointment_ids);
      
      // Validate appointment IDs
      if (!request.appointment_ids || !Array.isArray(request.appointment_ids) || request.appointment_ids.length === 0) {
        console.error("🔴 DECLINE: Invalid appointment_ids:", request.appointment_ids);
        toast.error("Error: No hay citas válidas para rechazar");
        setIsLoading(false);
        return;
      }
      
      console.log("🔴 DECLINE: Updating appointments to rejected:", request.appointment_ids);
      
      // Update all appointments in the group
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'rejected',
          last_modified_at: new Date().toISOString(),
          last_modified_by: user?.id
        })
        .in('id', request.appointment_ids)
        .select('id, status, client_name, provider_name');
        
      if (error) {
        console.error("🔴 DECLINE: Database update error:", error);
        console.error("🔴 DECLINE: Error details:", error.message, error.code, error.details);
        toast.error(`Error al rechazar la solicitud: ${error.message}`);
        setIsLoading(false);
        return;
      }
      
      console.log("✅ DECLINE: Database update successful:", data);
      
      const isGroup = request.appointment_count > 1;
      const successMessage = isGroup 
        ? `Serie de reservas ${request.recurrence_label?.toLowerCase()} rechazada`
        : "Solicitud rechazada correctamente";
      
      console.log("✅ DECLINE: Showing success message:", successMessage);
      toast.success(successMessage);
      
      // Invalidate queries to refresh the UI
      console.log("🔄 DECLINE: Invalidating queries for UI refresh");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-recurring-system'] }),
        queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
      ]);
      
      console.log("✅ DECLINE: Queries invalidated successfully");
      
      if (onDeclineRequest) {
        console.log("🔄 DECLINE: Calling onDeclineRequest callback");
        onDeclineRequest(request.id);
      }
      
      console.log("✅ DECLINE: Process completed successfully");
      
    } catch (error: any) {
      console.error("🔴 DECLINE: Unexpected error:", error);
      console.error("🔴 DECLINE: Error stack:", error.stack);
      toast.error(`Error inesperado: ${error.message}`);
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