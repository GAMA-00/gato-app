import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';

interface UseDailyRecurrenceGeneratorProps {
  appointmentId: string;
  recurrence: string;
  status: string;
  startTime: string;
}

/**
 * Hook to proactively generate next instance for DAILY recurring appointments
 * This ensures daily appointments always have their next occurrence ready
 */
export const useDailyRecurrenceGenerator = ({
  appointmentId,
  recurrence,
  status,
  startTime
}: UseDailyRecurrenceGeneratorProps) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only for daily recurrence and confirmed/pending appointments
    if (recurrence !== 'daily' || !['confirmed', 'pending'].includes(status)) {
      return;
    }

    const generateNextInstance = async () => {
      try {
        console.log('📅 Checking if next daily instance needs to be generated for:', appointmentId);

        // Get current appointment details
        const { data: currentAppointment } = await supabase
          .from('appointments')
          .select('id, start_time, end_time, recurrence, client_id, provider_id, listing_id, client_name, client_address, client_phone, client_email, notes')
          .eq('id', appointmentId)
          .single();

        if (!currentAppointment || currentAppointment.recurrence !== 'daily') {
          return;
        }

        // Calculate next day
        const currentStart = new Date(currentAppointment.start_time);
        const currentEnd = new Date(currentAppointment.end_time);
        const nextStart = addDays(currentStart, 1);
        const nextEnd = addDays(currentEnd, 1);

        // Check if next instance already exists
        const { data: existingNextInstance } = await supabase
          .from('appointments')
          .select('id')
          .eq('provider_id', currentAppointment.provider_id)
          .eq('client_id', currentAppointment.client_id)
          .eq('listing_id', currentAppointment.listing_id)
          .eq('start_time', nextStart.toISOString())
          .eq('recurrence', 'daily')
          .in('status', ['pending', 'confirmed'])
          .maybeSingle();

        if (existingNextInstance) {
          console.log('✅ Next daily instance already exists:', existingNextInstance.id);
          return;
        }

        console.log('🔄 Generating next daily instance for:', currentAppointment.client_name);

        // Create next instance using the RPC function
        const { data, error } = await supabase.rpc('advance_recurring_appointment', {
          p_appointment_id: appointmentId
        });

        if (error) {
          console.error('❌ Error generating next daily instance:', error);
          return;
        }

        console.log('✅ Next daily instance created successfully:', data);

        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-recurring-system'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-appointments'] });

      } catch (error) {
        console.error('❌ Error in daily recurrence generator:', error);
      }
    };

    // Generate with a small delay to avoid race conditions
    const timer = setTimeout(generateNextInstance, 2000);
    return () => clearTimeout(timer);
  }, [appointmentId, recurrence, status, startTime, queryClient]);

  return null;
};
