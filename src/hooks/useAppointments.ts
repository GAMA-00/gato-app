import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfToday, endOfDay, addDays, addWeeks } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';
import { useCalendarRecurringSystem } from '@/hooks/useCalendarRecurringSystem';

export const useAppointments = () => {
  const { user } = useAuth();

  // For providers, use the calendar system to get both regular and recurring appointments
  const { data: calendarAppointments = [], isLoading: isLoadingCalendar } = useCalendarRecurringSystem({
    selectedDate: startOfToday(),
    providerId: user?.role === 'provider' ? user?.id : undefined
  });

  // Get regular appointments (for clients or as fallback)
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
              duration,
              base_price,
              service_variants,
              custom_variable_groups
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
        
        // Filter out cancelled and rejected appointments
        const validAppointments = appointments.filter(app => 
          app.status !== 'cancelled' && app.status !== 'rejected'
        );

        // Step 2: Get unique client IDs for data fetching (only for non-external bookings)
        const clientIds = [...new Set(
          validAppointments
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

        // Step 4: Enhance appointments with complete client data AND GUARANTEED LOCATION
        const enhancedAppointments = validAppointments.map(appointment => {
          const clientData = clientsMap.get(appointment.client_id);
          
          console.log(`🔧 === GARANTIZANDO UBICACIÓN PARA APPOINTMENT ${appointment.id} ===`);
          console.log('Appointment data:', {
            id: appointment.id,
            client_id: appointment.client_id,
            external_booking: appointment.external_booking,
            client_address: appointment.client_address,
            has_client_data: !!clientData
          });

          // CONSTRUIR UBICACIÓN COMPLETA OBLIGATORIAMENTE
          const completeLocation = buildAppointmentLocation({
            appointment,
            clientData
          });

          console.log(`✅ UBICACIÓN GARANTIZADA PARA APPOINTMENT ${appointment.id}: "${completeLocation}"`);

          return {
            ...appointment,
            client_data: clientData || null,
            client_name: appointment.client_name || clientData?.name || 'Cliente',
            service_title: appointment.listings?.title || 'Servicio',
            complete_location: completeLocation  // GARANTIZAR QUE SIEMPRE HAY UBICACIÓN
          };
        });

        console.log(`Enhanced ${enhancedAppointments.length} appointments with GUARANTEED location data`);
        
        // Log sample data for debugging
        if (enhancedAppointments.length > 0) {
          console.log('=== SAMPLE ENHANCED APPOINTMENT WITH GUARANTEED LOCATION ===');
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
  
  // Note: Recurring instances are now handled by the unified calendar system
  const recurringInstances: any[] = [];

  console.log(`Recurring instances now handled by unified system: ${recurringInstances.length}`);

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

  // Return appropriate data based on user role
  if (user?.role === 'provider') {
    return {
      data: calendarAppointments,
      isLoading: isLoadingCalendar,
      error: null,
      regularAppointments: calendarAppointments.filter(app => !app.is_recurring_instance),
      recurringInstances: calendarAppointments.filter(app => app.is_recurring_instance)
    };
  } else {
    return {
      data: allAppointments,
      isLoading: isLoadingRegular,
      error,
      regularAppointments: regularOnly,
      recurringInstances
    };
  }
};
