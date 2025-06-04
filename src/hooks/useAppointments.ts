
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfToday, subDays } from 'date-fns';

export function useAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id, user?.role],
    queryFn: async () => {
      if (!user) {
        console.log("No user found, returning empty appointments array");
        return [];
      }

      console.log(`Fetching appointments for user ${user.id} with role ${user.role}`);
      
      try {
        // Only fetch appointments from yesterday onwards to improve performance
        const fromDate = subDays(startOfToday(), 1);
        
        let query = supabase
          .from('appointments')
          .select(`
            *,
            listings (
              id,
              title,
              base_price,
              duration
            ),
            residencias (
              id,
              name
            )
          `)
          .gte('start_time', fromDate.toISOString())
          .order('start_time', { ascending: true });

        // Add role-specific filters
        if (user.role === 'provider') {
          query = query.eq('provider_id', user.id);
        } else if (user.role === 'client') {
          query = query.eq('client_id', user.id);
        } else {
          console.log("Unknown user role, returning empty array");
          return [];
        }

        const { data: appointments, error } = await query;

        if (error) {
          console.error("Error fetching appointments:", error);
          throw error;
        }

        console.log(`Found ${appointments?.length || 0} appointments for user ${user.id}`);

        if (!appointments || appointments.length === 0) {
          return [];
        }

        // Process appointments with better error handling
        const processedAppointments = appointments.map((appointment) => {
          try {
            // Determine if external booking
            const isExternal = appointment.external_booking || !appointment.client_id;

            return {
              ...appointment,
              client_name: isExternal 
                ? (appointment.client_name || 'Cliente Externo')
                : (appointment.client_name || 'Cliente sin nombre'),
              client_phone: isExternal 
                ? appointment.client_phone 
                : appointment.client_phone,
              client_email: isExternal 
                ? appointment.client_email 
                : appointment.client_email,
              client_location: isExternal 
                ? (appointment.client_address || 'Ubicación externa')
                : 'Ubicación registrada',
              provider_name: appointment.provider_name || 'Proveedor',
              is_external: isExternal
            };
          } catch (error) {
            console.error("Error processing appointment:", appointment.id, error);
            // Return appointment with minimal processing if error occurs
            return {
              ...appointment,
              client_name: appointment.client_name || 'Cliente',
              provider_name: appointment.provider_name || 'Proveedor',
              client_location: 'Ubicación no especificada',
              is_external: false
            };
          }
        });

        console.log(`Processed ${processedAppointments.length} appointments`);
        return processedAppointments;
        
      } catch (error) {
        console.error("Error in appointments query:", error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 1, // Reduce retry attempts
    refetchOnWindowFocus: false,
    // Add error handling
    meta: {
      onError: (error: any) => {
        console.error("Appointments query failed:", error);
      }
    }
  });
}
