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
    const validPatterns = ['daily','weekly','biweekly','triweekly','monthly'] as const;
    const isValidRecurrence = recurrence && validPatterns.includes(recurrence as any);
    
    if (isCompleted && isValidRecurrence) {
      const advanceAppointment = async () => {
        console.log('🔄 Auto-advancing recurring appointment:', appointmentId, 'recurrence:', recurrence);
        
        try {
          const { data: appointmentData } = await supabase
            .from('appointments')
            .select('id, start_time, recurrence, status, last_modified_by, client_id, last_modified_at')
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

          // Check if there are any future appointments in this SPECIFIC series (same time pattern)
          // This ensures we distinguish between different recurring series of the same type
          const currentTimeOfDay = new Date(appointmentData.start_time).toTimeString().substr(0, 5); // HH:MM format
          
          const { data: futureAppointments } = await supabase
            .from('appointments')
            .select('id, start_time, status')
            .eq('client_id', appointmentData.client_id)
            .eq('recurrence', appointmentData.recurrence)
            .gt('start_time', appointmentData.start_time)
            .in('status', ['pending', 'confirmed'])
            .limit(10); // Get more to filter by time

          // Filter to only appointments that match the same time pattern (same hour/minute)
          const sameTimeSeriesAppointments = futureAppointments?.filter(apt => {
            const aptTimeOfDay = new Date(apt.start_time).toTimeString().substr(0, 5);
            return aptTimeOfDay === currentTimeOfDay;
          }) || [];

          if (sameTimeSeriesAppointments.length > 0) {
            console.log('⏭️ Future appointment already exists in this specific series, skipping advancement');
            console.log('🕐 Current time pattern:', currentTimeOfDay);
            console.log('📅 Existing future appointments:', sameTimeSeriesAppointments.map(apt => ({
              id: apt.id,
              time: new Date(apt.start_time).toTimeString().substr(0, 5),
              date: new Date(apt.start_time).toDateString()
            })));
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

      // Use shorter delay for recently modified appointments (likely skipped)
      const now = new Date();
      const delay = 500; // Always use short delay for immediate response
      const timer = setTimeout(advanceAppointment, delay);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, recurrence, appointmentId, queryClient, onAdvanced]);

  return null; // This is a logic-only component
};