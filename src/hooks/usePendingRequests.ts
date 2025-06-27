
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildCompleteLocation } from "@/utils/locationBuilder";

export function usePendingRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-requests', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'provider') {
        console.log("User is not a provider, returning empty array");
        return [];
      }
      
      console.log("=== PENDING REQUESTS QUERY START ===");
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
        
        if (!appointments || appointments.length === 0) {
          console.log("No pending appointments found for provider:", user.id);
          return [];
        }
        
        // Process appointments to add client information with complete location
        const processedAppointments = await Promise.all(
          appointments.map(async (appointment) => {
            console.log(`=== PROCESSING PENDING REQUEST APPOINTMENT ${appointment.id} ===`);
            
            let clientInfo = null;
            let clientLocation = 'Ubicación no especificada';

            // Get client information if it's not an external booking
            if (appointment.client_id && !appointment.external_booking) {
              console.log(`Fetching COMPLETE client data for client_id: ${appointment.client_id}`);
              
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
                  condominium_name,
                  residencias (
                    id,
                    name
                  )
                `)
                .eq('id', appointment.client_id)
                .single();

              if (clientError) {
                console.error("Error fetching client data for pending request:", appointment.id, clientError);
              } else if (clientData) {
                clientInfo = clientData;
                console.log("=== COMPLETE CLIENT DATA FOR PENDING REQUEST ===");
                console.log('Full client data:', JSON.stringify(clientData, null, 2));
                console.log('Residencia name:', clientData.residencias?.name);
                console.log('Condominium text (PRIMARY):', clientData.condominium_text);
                console.log('Condominium name (FALLBACK):', clientData.condominium_name);
                console.log('House number:', clientData.house_number);
                console.log('Apartment from appointment:', appointment.apartment);
                
                // Build complete location string using buildCompleteLocation utility
                const locationData = {
                  residenciaName: clientData.residencias?.name,
                  condominiumText: clientData.condominium_text,  // CRITICAL: Use condominium_text first
                  condominiumName: clientData.condominium_name,  // Fallback
                  houseNumber: clientData.house_number,
                  apartment: appointment.apartment,
                  isExternal: false
                };
                
                console.log('=== LOCATION DATA FOR PENDING REQUEST ===');
                console.log('Data being passed to buildCompleteLocation:', JSON.stringify(locationData, null, 2));
                clientLocation = buildCompleteLocation(locationData, appointment.id);
                
                console.log('Final client location for pending request:', clientLocation);
              }
            }

            // Handle external bookings
            const isExternal = appointment.external_booking || !appointment.client_id;

            if (isExternal) {
              console.log('External booking detected for pending request, using stored address:', appointment.client_address);
              clientLocation = buildCompleteLocation({
                clientAddress: appointment.client_address,
                isExternal: true
              }, appointment.id);
            }

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
              client_location: clientLocation,
              is_external: isExternal,
              service_name: appointment.listings?.title || 'Servicio'
            };

            console.log(`=== PROCESSED PENDING REQUEST ${appointment.id} ===`);
            console.log('Final location:', processed.client_location);
            console.log('Is external:', processed.is_external);
            
            return processed;
          })
        );
        
        console.log(`=== PENDING REQUESTS FINAL RESULTS ===`);
        console.log(`Returning ${processedAppointments.length} processed pending requests`);
        processedAppointments.forEach(app => {
          console.log(`Pending request ${app.id}: "${app.client_location}"`);
        });
        
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
