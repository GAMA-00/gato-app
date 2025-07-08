import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addWeeks, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';
import { useOptimizedRecurringInstances } from './useOptimizedRecurringInstances';

interface UseOptimizedCalendarAppointmentsProps {
  selectedDate: Date;
  providerId?: string;
}

export const useOptimizedCalendarAppointments = ({ 
  selectedDate, 
  providerId 
}: UseOptimizedCalendarAppointmentsProps) => {
  const { user } = useAuth();
  const effectiveProviderId = providerId || user?.id;

  // Optimize date range: 2 weeks back, 2 weeks forward
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const startDate = startOfDay(addWeeks(weekStart, -2));
  const endDate = endOfDay(addWeeks(weekStart, 2));

  console.log('🚀 OPTIMIZED CALENDAR QUERY START');
  console.log(`Provider ID: ${effectiveProviderId}`);
  console.log(`Optimized range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

  const { data: regularAppointments = [], isLoading: regularLoading } = useQuery({
    queryKey: ['optimized-calendar-appointments', format(selectedDate, 'yyyy-MM-dd'), effectiveProviderId],
    queryFn: async () => {
      if (!effectiveProviderId) return [];

      console.log('📊 Fetching regular appointments...');
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          listings(title, duration)
        `)
        .eq('provider_id', effectiveProviderId)
        .in('status', ['pending', 'confirmed', 'completed', 'scheduled'])
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('❌ Error fetching appointments:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} regular appointments`);
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchInterval: false,
    enabled: !!effectiveProviderId
  });

  // Get recurring instances using optimized hook
  const { data: recurringInstances = [], isLoading: recurringLoading } = useOptimizedRecurringInstances({
    providerId: effectiveProviderId,
    startDate,
    endDate,
    regularAppointments
  });

  // Combine and deduplicate appointments
  const allAppointments = React.useMemo(() => {
    console.log('🔄 Combining appointments...');
    
    // Process regular appointments
    const processedRegular = regularAppointments.map(appointment => ({
      ...appointment,
      is_recurring_instance: appointment.is_recurring_instance || false,
      client_name: appointment.client_name || 'Cliente',
      service_title: appointment.listings?.title || 'Servicio',
      complete_location: buildAppointmentLocation({
        appointment,
        clientData: null
      })
    }));

    // Combine all appointments
    const combined = [...processedRegular, ...recurringInstances];

    // Remove duplicates (prefer regular over generated instances)
    const uniqueAppointments = combined.reduce((acc, appointment) => {
      const key = `${appointment.provider_id}-${appointment.start_time}-${appointment.end_time}`;
      
      if (!acc.has(key)) {
        acc.set(key, appointment);
      } else {
        const existing = acc.get(key);
        // Prefer regular appointments over recurring instances
        if (!existing.is_recurring_instance && appointment.is_recurring_instance) {
          // Keep existing regular appointment
        } else if (existing.is_recurring_instance && !appointment.is_recurring_instance) {
          // Replace with regular appointment
          acc.set(key, appointment);
        }
      }
      
      return acc;
    }, new Map());

    const finalAppointments = Array.from(uniqueAppointments.values());
    
    console.log('📈 OPTIMIZED CALENDAR RESULT:');
    console.log(`  Regular: ${processedRegular.length}`);
    console.log(`  Recurring: ${recurringInstances.length}`);
    console.log(`  Final: ${finalAppointments.length}`);
    
    return finalAppointments;
  }, [regularAppointments, recurringInstances]);

  return {
    data: allAppointments,
    isLoading: regularLoading || recurringLoading,
    error: null
  };
};
