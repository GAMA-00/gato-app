
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
      
      // Only fetch appointments from yesterday onwards to improve performance
      const fromDate = subDays(startOfToday(), 1);
      
      try {
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

        // Process appointments in batches for better performance
        const processedAppointments = await Promise.all(
          appointments.map(async (appointment) => {
            let clientInfo = null;
            let clientLocation = 'Ubicación no especificada';

            // Only fetch client info if needed and not already in cache
            if (appointment.client_id && user.role === 'provider' && !appointment.external_booking) {
              try {
                const { data: clientData, error: clientError } = await supabase
                  .from('users')
                  .select(`
                    id,
                    name,
                    phone,
                    email,
                    house_number,
                    residencia_id,
                    condominium_text,
                    residencias (
                      id,
                      name
                    )
                  `)
                  .eq('id', appointment.client_id)
                  .single();

                if (!clientError && clientData) {
                  clientInfo = clientData;
                  
                  const locationParts = [];
                  if (clientData.residencias?.name) {
                    locationParts.push(clientData.residencias.name);
                  }
                  if (clientData.condominium_text) {
                    locationParts.push(clientData.condominium_text);
                  }
                  if (clientData.house_number) {
                    locationParts.push(`Casa ${clientData.house_number}`);
                  }
                  
                  clientLocation = locationParts.length > 0 
                    ? locationParts.join(' – ') 
                    : 'Ubicación no especificada';
                }
              } catch (error) {
                console.error("Error fetching client data:", error);
              }
            }

            // Determine if external booking
            const isExternal = appointment.external_booking || !appointment.client_id;

            return {
              ...appointment,
              client_name: isExternal 
                ? (appointment.client_name || 'Cliente Externo')
                : (clientInfo?.name || appointment.client_name || 'Cliente sin nombre'),
              client_phone: isExternal 
                ? appointment.client_phone 
                : (clientInfo?.phone || appointment.client_phone),
              client_email: isExternal 
                ? appointment.client_email 
                : (clientInfo?.email || appointment.client_email),
              client_location: isExternal 
                ? (appointment.client_address || 'Ubicación externa')
                : clientLocation,
              provider_name: appointment.provider_name || 'Proveedor',
              is_external: isExternal
            };
          })
        );

        console.log(`Processed ${processedAppointments.length} appointments`);
        return processedAppointments;
        
      } catch (error) {
        console.error("Error in appointments query:", error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds - data is fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute instead of more frequently
    retry: 2,
    refetchOnWindowFocus: false, // Disable refetch on window focus for better performance
  });
}
