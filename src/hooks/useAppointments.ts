
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
        // First, get the basic appointments data with listings and service types
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

        // Now enrich the appointments with complete location information
        const enrichedAppointments = await Promise.all(
          appointments.map(async (appointment) => {
            let clientInfo = null;
            let providerInfo = null;
            let residenciaInfo = null;
            let condominiumInfo = null;

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
                    condominium_id
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
                    email,
                    house_number,
                    residencia_id,
                    condominium_name,
                    condominium_id
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

            // Get residencia information - prioritize appointment's residencia_id, then client's
            const residenciaId = appointment.residencia_id || clientInfo?.residencia_id;
            if (residenciaId) {
              try {
                const { data: residenciaData, error: residenciaError } = await supabase
                  .from('residencias')
                  .select(`
                    id,
                    name,
                    address
                  `)
                  .eq('id', residenciaId)
                  .single();

                if (!residenciaError && residenciaData) {
                  residenciaInfo = residenciaData;
                }
              } catch (error) {
                console.error('Error fetching residencia data:', error);
              }
            }

            // Get condominium information if available
            const condominiumId = clientInfo?.condominium_id;
            if (condominiumId && !condominiumId.startsWith('static-')) {
              try {
                const { data: condominiumData, error: condominiumError } = await supabase
                  .from('condominiums')
                  .select(`
                    id,
                    name
                  `)
                  .eq('id', condominiumId)
                  .single();

                if (!condominiumError && condominiumData) {
                  condominiumInfo = condominiumData;
                }
              } catch (error) {
                console.error('Error fetching condominium data:', error);
              }
            }

            // Build complete location string with consistent logic
            const buildLocationString = () => {
              const parts = [];
              
              // Add residencia name
              if (residenciaInfo?.name) {
                parts.push(residenciaInfo.name);
              }
              
              // Add condominium name - prioritize database condominium, then user's stored name
              const condominiumName = condominiumInfo?.name || clientInfo?.condominium_name;
              if (condominiumName) {
                parts.push(condominiumName);
              }
              
              // Add house/apartment number - prioritize appointment apartment, then client house_number
              const houseNumber = appointment.apartment || clientInfo?.house_number;
              if (houseNumber) {
                // Ensure consistent format with "Casa" prefix if it's just a number
                if (/^\d+$/.test(houseNumber)) {
                  parts.push(`Casa ${houseNumber}`);
                } else if (!houseNumber.toLowerCase().includes('casa') && !houseNumber.startsWith('#')) {
                  parts.push(`Casa ${houseNumber}`);
                } else if (houseNumber.startsWith('#')) {
                  parts.push(houseNumber.replace('#', 'Casa '));
                } else {
                  parts.push(houseNumber);
                }
              }
              
              return parts.length > 0 ? parts.join(' – ') : 'Ubicación no especificada';
            };

            // For external bookings, use the stored address
            const locationString = appointment.external_booking || !appointment.client_id
              ? (appointment.client_address || 'Ubicación externa')
              : buildLocationString();

            console.log(`Building location for appointment ${appointment.id}:`, {
              residencia: residenciaInfo?.name,
              condominium: condominiumInfo?.name || clientInfo?.condominium_name,
              apartment: appointment.apartment,
              house_number: clientInfo?.house_number,
              final_location: locationString
            });

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
                : (condominiumInfo?.name || clientInfo?.condominium_name),
              // Provider information
              provider_name: providerInfo?.name || appointment.provider_name || 'Proveedor desconocido',
              // Complete location information
              residencias: residenciaInfo,
              condominiums: condominiumInfo,
              complete_location: locationString,
              // Additional metadata
              is_external: appointment.external_booking || !appointment.client_id,
              // User information for easier access
              users: clientInfo ? {
                name: clientInfo.name,
                phone: clientInfo.phone,
                email: clientInfo.email,
                house_number: clientInfo.house_number,
                condominium_name: clientInfo.condominium_name,
                residencias: residenciaInfo,
                condominiums: condominiumInfo
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
