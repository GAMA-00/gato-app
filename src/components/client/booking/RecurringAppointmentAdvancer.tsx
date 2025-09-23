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
          // First check if this appointment needs advancing and wasn't canceled
          const { data: appointmentData } = await supabase
            .from('appointments')
            .select('id, start_time, recurrence, status, last_modified_by, client_id')
            .eq('id', appointmentId)
            .single();
            
          if (!appointmentData) {
            console.log('❌ Appointment not found for advancing');
            return;
          }

          // Don't advance if the series was canceled by the client
          if (appointmentData.status === 'cancelled') {
            console.log('⏹️ Appointment was cancelled, skipping advancement');
            return;
          }

          // Don't advance if recurrence was removed (set to 'none')
          if (appointmentData.recurrence === 'none' || !appointmentData.recurrence) {
            console.log('⏹️ Recurrence was removed, skipping advancement');
            return;
          }

          // Check if there are any future appointments in this series that are already active
          const { data: futureAppointments } = await supabase
            .from('appointments')
            .select('id, start_time, status')
            .eq('client_id', appointmentData.client_id)
            .eq('recurrence', appointmentData.recurrence)
            .gt('start_time', appointmentData.start_time)
            .in('status', ['pending', 'confirmed'])
            .limit(1);

          if (futureAppointments && futureAppointments.length > 0) {
            console.log('⏭️ Future appointment already exists, skipping advancement');
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