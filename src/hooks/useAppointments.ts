
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringAppointments } from './useRecurringAppointments';
import { startOfToday, endOfDay, addDays } from 'date-fns';
import { buildCompleteLocation } from '@/utils/locationBuilder';

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

        // Step 2: Get unique client IDs for data fetching (only for non-external bookings)
        const clientIds = [...new Set(
          appointments
            .filter(appointment => appointment.client_id && !appointment.external_booking)
            .map(appointment => appointment.client_id)
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

        // Step 4: Enhance appointments with complete client data AND pre-built location
        const enhancedAppointments = appointments.map(appointment => {
          const clientData = clientsMap.get(appointment.client_id);
          
          console.log(`🔧 === BUILDING LOCATION FOR APPOINTMENT ${appointment.id} ===`);
          console.log('Appointment data:', {
            id: appointment.id,
            client_id: appointment.client_id,
            external_booking: appointment.external_booking,
            client_address: appointment.client_address,
            has_client_data: !!clientData
          });

          // BUILD COMPLETE LOCATION IMMEDIATELY
          let completeLocation = 'Ubicación no especificada';
          
          if (appointment.external_booking) {
            console.log('🌍 External booking - using client address');
            completeLocation = buildCompleteLocation({
              clientAddress: appointment.client_address,
              isExternal: true
            }, appointment.id);
          } else if (clientData) {
            console.log('🏠 Internal booking - building from client data');
            console.log('Client data for location:', {
              residencia: clientData.residencias?.name,
              condominium_text: clientData.condominium_text,
              condominium_name: clientData.condominium_name,
              house_number: clientData.house_number
            });
            
            const locationData = {
              residenciaName: clientData.residencias?.name,
              condominiumText: clientData.condominium_text,
              condominiumName: clientData.condominium_name,
              houseNumber: clientData.house_number,
              isExternal: false
            };
            
            completeLocation = buildCompleteLocation(locationData, appointment.id);
          }

          console.log(`✅ FINAL LOCATION FOR APPOINTMENT ${appointment.id}: "${completeLocation}"`);

          return {
            ...appointment,
            client_data: clientData || null,
            client_name: appointment.client_name || clientData?.name || 'Cliente',
            service_title: appointment.listings?.title || 'Servicio',
            complete_location: completeLocation  // STORE PRE-BUILT LOCATION
          };
        });

        console.log(`Enhanced ${enhancedAppointments.length} appointments with complete location data`);
        
        // Log sample data for debugging
        if (enhancedAppointments.length > 0) {
          console.log('=== SAMPLE ENHANCED APPOINTMENT WITH LOCATION ===');
          const sampleApp = enhancedAppointments[0];
          console.log('Sample appointment:', {
            id: sampleApp.id,
            client_name: sampleApp.client_name,
            external_booking: sampleApp.external_booking,
            complete_location: sampleApp.complete_location,
            has_client_data: !!sampleApp.client_data
          });
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
