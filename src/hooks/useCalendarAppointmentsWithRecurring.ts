import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, startOfDay, endOfDay } from 'date-fns';
import { useRecurringAppointments } from './useRecurringAppointments';

interface UseCalendarAppointmentsWithRecurringProps {
  selectedDate: Date;
  providerId?: string;
}

export const useCalendarAppointmentsWithRecurring = ({ 
  selectedDate, 
  providerId 
}: UseCalendarAppointmentsWithRecurringProps) => {
  // Extend range to 8 weeks for better coverage
  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(addWeeks(selectedDate, 8));

  console.log('=== CALENDAR APPOINTMENTS HOOK START ===');
  console.log(`Provider ID: ${providerId}`);
  console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

  // Get ALL appointments for the provider - simplified query
  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ['calendar-appointments-with-recurring', format(selectedDate, 'yyyy-MM-dd'), providerId],
    queryFn: async () => {
      console.log('=== FETCHING ALL APPOINTMENTS ===');
      
      if (!providerId) {
        console.log('No provider ID provided');
        return [];
      }

      // Get all appointments for the provider - no date filtering yet
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          listings(
            title,
            duration
          )
        `)
        .eq('provider_id', providerId)
        .not('status', 'in', '(cancelled,rejected)')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      console.log(`Raw appointments from DB: ${data?.length || 0}`);
      return data || [];
    },
    staleTime: 60000,
    refetchInterval: false
  });

  // Filter active appointments (not cancelled/rejected)
  const activeAppointments = allAppointments.filter(appointment => {
    const isActive = appointment.status !== 'cancelled' && appointment.status !== 'rejected';
    return isActive;
  });

  console.log(`Active appointments: ${activeAppointments.length} out of ${allAppointments.length}`);

  // Separate regular and recurring appointments
  const regularAppointments = activeAppointments.filter(appointment => {
    const isRegular = !appointment.recurrence || 
                     appointment.recurrence === 'none' || 
                     appointment.recurrence === null ||
                     appointment.is_recurring_instance === true; // Include recurring instances as regular
    return isRegular;
  });

  const recurringBaseAppointments = activeAppointments.filter(appointment => {
    const isRecurring = appointment.recurrence && 
                       appointment.recurrence !== 'none' && 
                       appointment.recurrence !== null &&
                       !appointment.is_recurring_instance; // Only base recurring appointments
    return isRecurring;
  });

  console.log(`Regular appointments (including instances): ${regularAppointments.length}`);
  console.log(`Recurring base appointments: ${recurringBaseAppointments.length}`);

  // Generate recurring instances
  const recurringInstances = useRecurringAppointments({
    recurringAppointments: recurringBaseAppointments,
    startDate,
    endDate
  });

  console.log(`Generated recurring instances: ${recurringInstances.length}`);

  // Filter regular appointments in date range
  const regularInRange = regularAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.start_time);
    const isInRange = appointmentDate >= startDate && appointmentDate <= endDate;
    return isInRange;
  });

  console.log(`Regular appointments in range: ${regularInRange.length}`);

  // Combine and deduplicate appointments
  const allCombined = [
    ...regularInRange.map(appointment => ({
      ...appointment,
      is_recurring_instance: appointment.is_recurring_instance || false,
      client_name: appointment.client_name || 'Cliente',
      service_title: appointment.listings?.title || 'Servicio'
    })),
    ...recurringInstances
  ];

  // Remove duplicates by creating a unique key for each appointment slot
  const uniqueAppointments = allCombined.reduce((acc, appointment) => {
    const key = `${appointment.provider_id}-${appointment.start_time}-${appointment.end_time}`;
    
    // If we haven't seen this time slot before, add it
    if (!acc.has(key)) {
      acc.set(key, appointment);
    } else {
      // If we have seen it, prefer regular appointments over generated instances
      const existing = acc.get(key);
      if (!existing.is_recurring_instance && appointment.is_recurring_instance) {
        // Keep existing regular appointment
        console.log(`Skipping duplicate recurring instance for ${appointment.start_time}`);
      } else if (existing.is_recurring_instance && !appointment.is_recurring_instance) {
        // Replace with regular appointment
        acc.set(key, appointment);
        console.log(`Replacing recurring instance with regular appointment for ${appointment.start_time}`);
      }
    }
    
    return acc;
  }, new Map());

  const finalAppointments = Array.from(uniqueAppointments.values());

  console.log('=== FINAL CALENDAR RESULT ===');
  console.log(`Regular in range: ${regularInRange.length}`);
  console.log(`Recurring instances: ${recurringInstances.length}`);
  console.log(`Combined total: ${allCombined.length}`);
  console.log(`After deduplication: ${finalAppointments.length}`);
  console.log('===============================');

  return {
    data: finalAppointments,
    isLoading,
    regularAppointments: regularInRange,
    recurringInstances,
    conflicts: []
  };
};
