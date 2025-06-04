
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Fetching appointments for user:", user.id, "role:", user.role);
      
      // Simple query structure
      let query = supabase
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
        `);

      // Filter based on user role
      if (user.role === 'provider') {
        query = query.eq('provider_id', user.id);
      } else if (user.role === 'client') {
        query = query.eq('client_id', user.id);
      }

      query = query.order('start_time', { ascending: true });

      const { data: appointments, error } = await query;

      if (error) {
        console.error("Error fetching appointments:", error);
        throw error;
      }

      console.log("Raw appointments data:", appointments);

      if (!appointments || appointments.length === 0) {
        console.log("No appointments found");
        return [];
      }

      // Process each appointment to get complete information
      const processedAppointments = await Promise.all(
        appointments.map(async (appointment) => {
          console.log(`Processing appointment ${appointment.id}:`, appointment);
          
          let clientInfo = null;
          let providerInfo = null;
          let clientLocation = 'Ubicación no especificada';

          // Get client information if needed
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
                residencias (
                  id,
                  name
                )
              `)
              .eq('id', appointment.client_id)
              .single();

            if (clientError) {
              console.error("Error fetching client data:", clientError);
            } else if (clientData) {
              clientInfo = clientData;
              console.log("Client data found:", clientData);
              
              // Build location string
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
          }

          // Get provider information if needed
          if (appointment.provider_id) {
            const { data: providerData, error: providerError } = await supabase
              .from('users')
              .select('id, name, phone, email')
              .eq('id', appointment.provider_id)
              .single();

            if (providerError) {
              console.error("Error fetching provider data:", providerError);
            } else if (providerData) {
              providerInfo = providerData;
            }
          }

          // Handle external bookings
          const isExternal = appointment.external_booking || !appointment.client_id;

          const processedAppointment = {
            ...appointment,
            client_name: isExternal 
              ? (appointment.client_name || 'Cliente Externo')
              : (clientInfo?.name || 'Cliente sin nombre'),
            provider_name: providerInfo?.name || 'Proveedor desconocido',
            client_phone: isExternal 
              ? appointment.client_phone 
              : clientInfo?.phone,
            client_email: isExternal 
              ? appointment.client_email 
              : clientInfo?.email,
            client_location: isExternal 
              ? (appointment.client_address || 'Ubicación externa')
              : clientLocation,
            is_external: isExternal,
            service_name: appointment.listings?.title || 'Servicio'
          };

          console.log(`Processed appointment ${appointment.id}:`, processedAppointment);
          return processedAppointment;
        })
      );

      console.log("Final processed appointments:", processedAppointments);
      return processedAppointments;
    },
    enabled: !!user,
    refetchInterval: 30000,
    retry: 3
  });
}
