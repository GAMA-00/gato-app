
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
      if (!user?.id) {
        console.log('useAppointments: No user ID available');
        return [];
      }

      console.log('=== FETCHING APPOINTMENTS WITH COMPLETE DATA FOR DASHBOARD ===');
      console.log(`User ID: ${user.id}, Role: ${user.role}`);

      try {
        // Step 1: Get basic appointments with listings data
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

        const { data: appointments, error: appointmentsError } = await query;

        if (appointmentsError) {
          console.error('Error fetching appointments:', appointmentsError);
          return [];
        }

        if (!appointments || appointments.length === 0) {
          console.log('No appointments found');
          return [];
        }

        console.log(`Fetched ${appointments.length} basic appointments`);

        // Step 2: Get unique client IDs for data fetching
        const clientIds = [...new Set(
          appointments
            .map(appointment => appointment.client_id)
            .filter(id => id && !appointment.external_booking)
        )];

        let clientsData = [];
        if (clientIds.length > 0) {
          console.log('Fetching client data for IDs:', clientIds);
          
          const { data: clients, error: clientsError } = await supabase
            .from('users')
            .select(`
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
            `)
            .in('id', clientIds);

          if (clientsError) {
            console.error('Error fetching clients data:', clientsError);
          } else {
            clientsData = clients || [];
            console.log(`Fetched data for ${clientsData.length} clients`);
          }
        }

        // Step 3: Create a map for quick client data lookup
        const clientsMap = new Map(clientsData.map(client => [client.id, client]));

        // Step 4: Enhance appointments with complete client data
        const enhancedAppointments = appointments.map(appointment => {
          const clientData = clientsMap.get(appointment.client_id);
          
          console.log(`Processing appointment ${appointment.id}:`, {
            client_id: appointment.client_id,
            external_booking: appointment.external_booking,
            has_client_data: !!clientData,
            client_name: appointment.client_name
          });

          if (clientData) {
            console.log(`Client data for appointment ${appointment.id}:`, {
              name: clientData.name,
              house_number: clientData.house_number,
              condominium_text: clientData.condominium_text,
              condominium_name: clientData.condominium_name,
              residencia_name: clientData.residencias?.name
            });
          }

          return {
            ...appointment,
            client_data: clientData || null,
            client_name: appointment.client_name || clientData?.name || 'Cliente',
            service_title: appointment.listings?.title || 'Servicio'
          };
        });

        console.log(`Enhanced ${enhancedAppointments.length} appointments with complete client data`);
        
        // Log sample data for debugging
        if (enhancedAppointments.length > 0) {
          console.log('=== SAMPLE ENHANCED APPOINTMENT DATA ===');
          const sampleApp = enhancedAppointments[0];
          console.log('Sample appointment:', {
            id: sampleApp.id,
            client_name: sampleApp.client_name,
            external_booking: sampleApp.external_booking,
            client_address: sampleApp.client_address,
            apartment: sampleApp.apartment,
            has_client_data: !!sampleApp.client_data
          });
          
          if (sampleApp.client_data) {
            console.log('Complete client data:', {
              name: sampleApp.client_data.name,
              house_number: sampleApp.client_data.house_number,
              condominium_text: sampleApp.client_data.condominium_text,
              condominium_name: sampleApp.client_data.condominium_name,
              residencia: sampleApp.client_data.residencias?.name
            });
          }
        }
        
        return enhancedAppointments;
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
  const regularOnly = regularAppointments.filter(appointment => 
    !appointment.recurrence || appointment.recurrence === 'none'
  );
  
  const recurringBase = regularAppointments.filter(appointment => 
    appointment.recurrence && appointment.recurrence !== 'none'
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
    ...regularOnly.map(appointment => ({
      ...appointment,
      is_recurring_instance: false
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
