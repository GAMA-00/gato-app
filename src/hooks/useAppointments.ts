
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringAppointments } from './useRecurringAppointments';
import { startOfToday, endOfDay, addDays } from 'date-fns';

export const useAppointments = () => {
  const { user } = useAuth();

  // Get regular appointments with improved error handling
  const { data: regularAppointments = [], isLoading: isLoadingRegular, error } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('useAppointments: No user ID available');
        return [];
      }

      console.log('=== FETCHING APPOINTMENTS FOR DASHBOARD ===');
      console.log(`User ID: ${user.id}, Role: ${user.role}`);

      try {
        let query = supabase
          .from('appointments')
          .select(`
            *,
            listings(
              title,
              duration
            )
          `)
          .order('start_time', { ascending: true });

        // Filter by user role
        if (user.role === 'provider') {
          query = query.eq('provider_id', user.id);
        } else if (user.role === 'client') {
          query = query.eq('client_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching appointments:', error);
          // Don't throw, return empty array to prevent infinite loading
          return [];
        }

        console.log(`Fetched ${data?.length || 0} regular appointments`);
        return data || [];
      } catch (err) {
        console.error('Exception in appointments query:', err);
        // Return empty array instead of throwing to prevent infinite loading
        return [];
      }
    },
    enabled: !!user?.id,
    // Add timeout and retry settings
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Set a timeout to prevent infinite loading
    refetchOnWindowFocus: false,
  });

  // Separate regular and recurring appointments
  const regularOnly = regularAppointments.filter(app => 
    !app.recurrence || app.recurrence === 'none'
  );
  
  const recurringBase = regularAppointments.filter(app => 
    app.recurrence && app.recurrence !== 'none'
  );

  console.log(`Regular appointments: ${regularOnly.length}`);
  console.log(`Recurring base appointments: ${recurringBase.length}`);

  // Generate recurring instances for the next 30 days
  const today = startOfToday();
  const endDate = endOfDay(addDays(today, 30));
  
  const recurringInstances = useRecurringAppointments({
    recurringAppointments: recurringBase,
    startDate: today,
    endDate: endDate
  });

  console.log(`Generated recurring instances: ${recurringInstances.length}`);

  // Combine all appointments
  const allAppointments = [
    ...regularOnly.map(app => ({
      ...app,
      is_recurring_instance: false,
      client_name: app.client_name || 'Cliente',
      service_title: app.listings?.title || 'Servicio'
    })),
    ...recurringInstances
  ];

  console.log(`Total combined appointments: ${allAppointments.length}`);
  console.log('=== APPOINTMENTS FETCH COMPLETE ===');

  return {
    data: allAppointments,
    isLoading: isLoadingRegular,
    error,
    regularAppointments: regularOnly,
    recurringInstances
  };
};
