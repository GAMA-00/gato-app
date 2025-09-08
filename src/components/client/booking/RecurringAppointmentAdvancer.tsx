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
        console.log('🔄 Auto-advancing recurring appointment:', appointmentId);
        try {
          const { data, error } = await supabase.rpc('advance_recurring_appointment', {
            p_appointment_id: appointmentId
          });

          if (error) {
            console.error('Error advancing recurring appointment:', error);
            return;
          }

          console.log('✅ Recurring appointment advanced successfully');
          
          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
          
          onAdvanced();
          
          toast.success('Tu próxima cita recurrente ha sido programada automáticamente');
        } catch (error) {
          console.error('Error in auto-advance:', error);
        }
      };

      // Small delay to ensure completion status is processed
      const timer = setTimeout(advanceAppointment, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, recurrence, appointmentId, queryClient, onAdvanced]);

  return null; // This is a logic-only component
};