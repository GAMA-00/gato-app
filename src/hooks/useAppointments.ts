
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfToday, endOfTomorrow } from 'date-fns';

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
        // Simple, focused query for dashboard - only today and tomorrow
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
            created_at
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

        // Get unique listing IDs for a separate, smaller query
        const listingIds = [...new Set(appointmentsList.map(apt => apt.listing_id).filter(Boolean))];
        
        // Fetch only essential listing data
        let listingsMap: Record<string, any> = {};
        if (listingIds.length > 0) {
          try {
            const { data: listings } = await supabase
              .from('listings')
              .select('id, title')
              .in('id', listingIds);

            if (listings) {
              listingsMap = listings.reduce((acc, listing) => {
                acc[listing.id] = { title: listing.title };
                return acc;
              }, {} as Record<string, any>);
            }
          } catch (error) {
            console.warn('Could not fetch listings:', error);
          }
        }

        // Get unique client/provider IDs for user data
        const userRole = user.role;
        const userIds = [...new Set(
          appointmentsList.map(apt => 
            userRole === 'provider' ? apt.client_id : apt.provider_id
          ).filter(Boolean)
        )];
        
        // Fetch minimal user data
        let usersMap: Record<string, any> = {};
        if (userIds.length > 0) {
          try {
            const { data: users } = await supabase
              .from('users')
              .select('id, name, phone')
              .in('id', userIds);

            if (users) {
              usersMap = users.reduce((acc, user) => {
                acc[user.id] = {
                  name: user.name || '',
                  phone: user.phone || ''
                };
                return acc;
              }, {} as Record<string, any>);
            }
          } catch (error) {
            console.warn('Could not fetch users:', error);
          }
        }

        // Enhanced appointments with minimal data
        const enhancedAppointments = appointmentsList.map(appointment => ({
          ...appointment,
          listings: listingsMap[appointment.listing_id] || null,
          users: appointment.client_id && userRole === 'provider' 
            ? usersMap[appointment.client_id] || null 
            : appointment.provider_id && userRole === 'client'
            ? usersMap[appointment.provider_id] || null
            : null
        }));

        console.log(`Successfully processed ${enhancedAppointments.length} dashboard appointments`);
        return enhancedAppointments;
        
      } catch (error) {
        console.error('Error in dashboard appointments query:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 120000, // 2 minutes
    retry: 1, // Reduce retry attempts for faster failure
    refetchOnWindowFocus: false
  });
};
