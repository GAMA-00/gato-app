
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringAppointments } from './useRecurringAppointments';
import { startOfToday, endOfDay, addDays } from 'date-fns';

export const useAppointments = () => {
  const { user } = useAuth();

  // Get regular appointments
  const { data: regularAppointments = [], isLoading: isLoadingRegular, error } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('=== FETCHING APPOINTMENTS FOR DASHBOARD ===');
      console.log(`User ID: ${user.id}, Role: ${user.role}`);

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
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} regular appointments`);
      return data || [];
    },
    enabled: !!user?.id,
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
