
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfToday, endOfTomorrow } from 'date-fns';
import { buildLocationString, logLocationDebug } from '@/utils/locationUtils';

export const useAppointments = () => {
  const { user } = useAuth();
  
  const today = startOfToday();
  const tomorrowEnd = endOfTomorrow();
  
  return useQuery({
    queryKey: ['appointments', user?.id, 'dashboard'],
    queryFn: async () => {
      if (!user?.id) {
        console.log('No user ID available for appointments');
        return [];
      }

      console.log('Fetching dashboard appointments for user:', user.id, 'role:', user.role);

      try {
        // Enhanced query to get complete location data
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(`
            id,
            provider_id,
            client_id,
            listing_id,
            start_time,
            end_time,
            status,
            notes,
            client_name,
            provider_name,
            external_booking,
            is_recurring_instance,
            recurrence,
            created_at,
            client_address,
            apartment,
            residencia_id,
            listings!inner(
              id,
              title
            ),
            residencias(
              id,
              name
            )
          `)
          .eq(user.role === 'provider' ? 'provider_id' : 'client_id', user.id)
          .gte('start_time', today.toISOString())
          .lte('start_time', tomorrowEnd.toISOString())
          .in('status', ['pending', 'confirmed', 'completed'])
          .order('start_time', { ascending: true });

        if (error) {
          console.error('Error fetching appointments:', error);
          throw new Error(`Error fetching appointments: ${error.message}`);
        }

        const appointmentsList = appointments || [];
        console.log(`Found ${appointmentsList.length} dashboard appointments`);

        // Get unique client IDs to fetch user data
        const userRole = user.role;
        const userIds = [...new Set(
          appointmentsList.map(apt => 
            userRole === 'provider' ? apt.client_id : apt.provider_id
          ).filter(Boolean)
        )];
        
        // Fetch user data including condominium information
        let usersMap: Record<string, any> = {};
        if (userIds.length > 0) {
          try {
            const { data: users } = await supabase
              .from('users')
              .select(`
                id, 
                name, 
                phone,
                house_number,
                condominium_name,
                condominium_text,
                residencia_id
              `)
              .in('id', userIds);

            if (users) {
              usersMap = users.reduce((acc, user) => {
                acc[user.id] = user;
                return acc;
              }, {} as Record<string, any>);
            }
          } catch (error) {
            console.warn('Could not fetch users:', error);
          }
        }

        // Enhanced appointments with complete location data
        const enhancedAppointments = appointmentsList.map(appointment => {
          const isExternal = appointment.external_booking;
          const userInfo = appointment.client_id && userRole === 'provider' 
            ? usersMap[appointment.client_id] 
            : appointment.provider_id && userRole === 'client'
            ? usersMap[appointment.provider_id] 
            : null;

          // Build complete location string
          const locationData = {
            residenciaName: appointment.residencias?.name,
            condominiumName: userInfo?.condominium_name || userInfo?.condominium_text,
            houseNumber: userInfo?.house_number,
            apartment: appointment.apartment,
            clientAddress: appointment.client_address,
            isExternal: isExternal
          };

          const completeLocation = buildLocationString(locationData);
          
          // Log for debugging
          logLocationDebug(appointment.id, locationData, completeLocation);

          return {
            ...appointment,
            listings: appointment.listings,
            users: userInfo,
            complete_location: completeLocation
          };
        });

        console.log(`Successfully processed ${enhancedAppointments.length} dashboard appointments with location data`);
        return enhancedAppointments;
        
      } catch (error) {
        console.error('Error in dashboard appointments query:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 120000, // 2 minutes
    retry: 1,
    refetchOnWindowFocus: false
  });
};
