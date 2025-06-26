
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildLocationString } from "@/utils/locationUtils";

export function usePendingRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-requests', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'provider') {
        console.log("User is not a provider, returning empty array");
        return [];
      }
      
      console.log("Fetching pending requests for provider:", user.id);
      
      try {
        // Simple query first - get all pending appointments for this provider
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(`
            *,
            listings (
              id,
              title,
              description,
              base_price,
              duration
            )
          `)
          .eq('provider_id', user.id)
          .eq('status', 'pending')
          .order('start_time', { ascending: true });
          
        if (error) {
          console.error("Error fetching pending apartments:", error);
          throw error;
        }
        
        console.log("Raw pending appointments found:", appointments?.length || 0);
        console.log("Pending appointments data:", appointments);
        
        if (!appointments || appointments.length === 0) {
          console.log("No pending appointments found for provider:", user.id);
          return [];
        }
        
        // Process appointments to add client information
        const processedAppointments = await Promise.all(
          appointments.map(async (appointment) => {
            console.log(`Processing pending appointment ${appointment.id}:`, appointment);
            
            let clientInfo = null;
            let clientLocation = 'Ubicación no especificada';

            // Get client information if it's not an external booking
            if (appointment.client_id && !appointment.external_booking) {
              console.log(`Fetching client data for client_id: ${appointment.client_id}`);
              
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
                  apartment,
                  residencias (
                    id,
                    name
                  )
                `)
                .eq('id', appointment.client_id)
                .single();

              if (clientError) {
                console.error("Error fetching client data for appointment:", appointment.id, clientError);
              } else if (clientData) {
                clientInfo = clientData;
                console.log("Client data found:", clientData);
                
                // Build location string using buildLocationString utility
                clientLocation = buildLocationString({
                  residenciaName: clientData.residencias?.name,
                  condominiumName: clientData.condominium_text,
                  houseNumber: clientData.house_number,
                  apartment: clientData.apartment || appointment.apartment,
                  isExternal: false
                });
              }
            }

            // Handle external bookings
            const isExternal = appointment.external_booking || !appointment.client_id;

            const processed = {
              ...appointment,
              client_name: isExternal 
                ? (appointment.client_name || 'Cliente Externo')
                : (clientInfo?.name || 'Cliente sin nombre'),
              client_phone: isExternal 
                ? appointment.client_phone 
                : clientInfo?.phone,
              client_email: isExternal 
                ? appointment.client_email 
                : clientInfo?.email,
              client_location: isExternal 
                ? buildLocationString({
                    clientAddress: appointment.client_address,
                    isExternal: true
                  })
                : clientLocation,
              is_external: isExternal,
              service_name: appointment.listings?.title || 'Servicio'
            };

            console.log(`Processed pending appointment ${appointment.id}:`, processed);
            return processed;
          })
        );
        
        console.log(`Returning ${processedAppointments.length} processed pending requests`);
        return processedAppointments;
        
      } catch (error) {
        console.error("Error in pending requests query:", error);
        throw error;
      }
    },
    enabled: !!user && user.role === 'provider',
    refetchInterval: 10000, // Check for new requests every 10 seconds
    retry: 3,
    staleTime: 5000 // Consider data stale after 5 seconds
  });
}
