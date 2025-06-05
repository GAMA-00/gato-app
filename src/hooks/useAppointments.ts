
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAppointments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('Fetching appointments for user:', user.id, 'role:', user.role);

      try {
        // First, get the basic appointments data
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            listings!inner(
              title,
              service_type_id,
              base_price,
              duration,
              service_types(name)
            ),
            residencias(
              name
            )
          `)
          .or(`provider_id.eq.${user.id},client_id.eq.${user.id}`)
          .order('start_time', { ascending: true });

        if (appointmentsError) {
          console.error('Error fetching appointments:', appointmentsError);
          throw appointmentsError;
        }

        if (!appointments || appointments.length === 0) {
          console.log('No appointments found for user:', user.id);
          return [];
        }

        console.log(`Found ${appointments.length} appointments`);

        // Now enrich the appointments with user information
        const enrichedAppointments = await Promise.all(
          appointments.map(async (appointment) => {
            let clientInfo = null;
            let providerInfo = null;

            // Get client information if not external booking
            if (appointment.client_id && !appointment.external_booking) {
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
                    condominium_name,
                    residencias (
                      id,
                      name
                    )
                  `)
                  .eq('id', appointment.client_id)
                  .single();

                if (!clientError && clientData) {
                  clientInfo = clientData;
                }
              } catch (error) {
                console.error('Error fetching client data:', error);
              }
            }

            // Get provider information
            if (appointment.provider_id) {
              try {
                const { data: providerData, error: providerError } = await supabase
                  .from('users')
                  .select(`
                    id,
                    name,
                    phone,
                    email
                  `)
                  .eq('id', appointment.provider_id)
                  .single();

                if (!providerError && providerData) {
                  providerInfo = providerData;
                }
              } catch (error) {
                console.error('Error fetching provider data:', error);
              }
            }

            // Build the enriched appointment object
            return {
              ...appointment,
              // Client information
              client_name: appointment.external_booking 
                ? (appointment.client_name || 'Cliente Externo')
                : (clientInfo?.name || 'Cliente sin nombre'),
              client_phone: appointment.external_booking 
                ? appointment.client_phone 
                : clientInfo?.phone,
              client_email: appointment.external_booking 
                ? appointment.client_email 
                : clientInfo?.email,
              client_condominium: appointment.external_booking
                ? null
                : clientInfo?.condominium_name,
              // Provider information
              provider_name: providerInfo?.name || appointment.provider_name || 'Proveedor desconocido',
              // Additional metadata
              is_external: appointment.external_booking || !appointment.client_id,
              // User information for easier access
              users: clientInfo ? {
                name: clientInfo.name,
                phone: clientInfo.phone,
                email: clientInfo.email,
                house_number: clientInfo.house_number,
                condominium_name: clientInfo.condominium_name,
                residencias: clientInfo.residencias
              } : null
            };
          })
        );

        console.log(`Returning ${enrichedAppointments.length} enriched appointments`);
        return enrichedAppointments;

      } catch (error) {
        console.error('Error in appointments query:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 3,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });
};
