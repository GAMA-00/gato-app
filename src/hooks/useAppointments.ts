
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringAppointments } from './useRecurringAppointments';
import { startOfToday, endOfDay, addDays } from 'date-fns';

export const useAppointments = () => {
  const { user } = useAuth();

  // Get regular appointments with complete client and residence data
  const { data: regularAppointments = [], isLoading: isLoadingRegular, error } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('useAppointments: No user ID available');
        return [];
      }

      console.log('=== FETCHING APPOINTMENTS WITH COMPLETE DATA FOR DASHBOARD ===');
      console.log(`User ID: ${user.id}, Role: ${user.role}`);

      try {
        let query = supabase
          .from('appointments')
          .select(`
            *,
            listings(
              title,
              duration
            ),
            client_data:users!appointments_client_id_fkey(
              id,
              name,
              phone,
              email,
              house_number,
              condominium_text,
              condominium_name,
              residencia_id,
              residencias(
                id,
                name
              )
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
          console.error('Error fetching appointments with complete data:', error);
          return [];
        }

        console.log(`Fetched ${data?.length || 0} appointments with complete client data`);
        
        // Log sample data for debugging
        if (data && data.length > 0) {
          console.log('=== SAMPLE APPOINTMENT DATA WITH CLIENT INFO ===');
          const sampleApp = data[0];
          console.log('Sample appointment:', {
            id: sampleApp.id,
            client_name: sampleApp.client_name,
            external_booking: sampleApp.external_booking,
            client_address: sampleApp.client_address,
            apartment: sampleApp.apartment,
            client_data: sampleApp.client_data
          });
          
          if (sampleApp.client_data) {
            console.log('Client data details:', {
              name: sampleApp.client_data.name,
              house_number: sampleApp.client_data.house_number,
              condominium_text: sampleApp.client_data.condominium_text,
              condominium_name: sampleApp.client_data.condominium_name,
              residencia: sampleApp.client_data.residencias?.name
            });
          }
        }
        
        return data || [];
      } catch (err) {
        console.error('Exception in appointments query:', err);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
      client_name: app.client_name || app.client_data?.name || 'Cliente',
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
