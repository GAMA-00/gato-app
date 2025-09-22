import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RecurringAppointmentAdvancerProps {
  appointmentId: string;
  isCompleted: boolean;
  recurrence: string;
  onAdvanced: () => void;
}

export const RecurringAppointmentAdvancer = ({
  appointmentId,
  isCompleted,
  recurrence,
  onAdvanced
}: RecurringAppointmentAdvancerProps) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Auto-advance recurring appointments when completed
    const validPatterns = ['weekly','biweekly','triweekly','monthly'] as const;
    const isValidRecurrence = recurrence && validPatterns.includes(recurrence as any);
    
    if (isCompleted && isValidRecurrence) {
      const advanceAppointment = async () => {
        console.log('🔄 Auto-advancing recurring appointment:', appointmentId, 'recurrence:', recurrence);
        
        try {
          // First check if this appointment needs advancing
          const { data: appointmentData } = await supabase
            .from('appointments')
            .select('id, start_time, recurrence, status')
            .eq('id', appointmentId)
            .single();
            
          if (!appointmentData) {
            console.log('❌ Appointment not found for advancing');
            return;
          }
          
          console.log('📅 Appointment to advance:', appointmentData);
          
          const { data, error } = await supabase.rpc('advance_recurring_appointment', {
            p_appointment_id: appointmentId
          });

          if (error) {
            console.error('❌ Error advancing recurring appointment:', error);
            // Still refresh UI in case of partial success
            queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
            return;
          }

          console.log('✅ Recurring appointment advanced successfully, result:', data);
          
          // Invalidate all relevant queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-appointments'] });
          
          onAdvanced();
          
          toast.success('Tu próxima cita recurrente ha sido programada automáticamente');
        } catch (error) {
          console.error('❌ Error in auto-advance:', error);
          // Still refresh UI to show current state
          queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
        }
      };

      // Small delay to ensure completion status is processed
      const timer = setTimeout(advanceAppointment, 1500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, recurrence, appointmentId, queryClient, onAdvanced]);

  return null; // This is a logic-only component
};