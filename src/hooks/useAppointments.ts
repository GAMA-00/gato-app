
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
          ),
          residencias (
            id,
            name
          )
        `);

      // Filter based on user role
      if (user.role === 'provider') {
        query = query.eq('provider_id', user.id);
      } else if (user.role === 'client') {
        query = query.eq('client_id', user.id);
      }

      query = query.order('start_time', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching appointments:", error);
        throw error;
      }

      console.log("Raw appointments data:", data);

      // Process appointments to add client/provider information
      const processedAppointments = await Promise.all(
        (data || []).map(async (appointment) => {
          let clientInfo = null;
          let providerInfo = null;
          let clientLocation = 'Ubicación no especificada';

          // Get client information
          if (appointment.client_id) {
            const { data: clientData } = await supabase
              .from('users')
              .select(`
                id,
                name,
                phone,
                email,
                house_number,
                residencia_id,
                condominium_text
              `)
              .eq('id', appointment.client_id)
              .eq('role', 'client')
              .single();

            if (clientData) {
              clientInfo = clientData;
              
              // Build location string
              const locationParts = [];
              
              if (appointment.residencias?.name) {
                locationParts.push(appointment.residencias.name);
              }
              
              if (clientData.condominium_text) {
                locationParts.push(clientData.condominium_text);
              }
              
              if (clientData.house_number) {
                locationParts.push(clientData.house_number);
              }
              
              clientLocation = locationParts.length > 0 
                ? locationParts.join(' – ') 
                : 'Ubicación no especificada';
            }
          }

          // Get provider information
          if (appointment.provider_id) {
            const { data: providerData } = await supabase
              .from('users')
              .select('id, name, phone, email')
              .eq('id', appointment.provider_id)
              .eq('role', 'provider')
              .single();

            if (providerData) {
              providerInfo = providerData;
            }
          }

          // Handle external bookings
          const isExternal = appointment.external_booking || !appointment.client_id;

          return {
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
              ? (appointment.client_address || 'Ubicación no especificada')
              : clientLocation,
            is_external: isExternal
          };
        })
      );

      console.log("Processed appointments:", processedAppointments);
      return processedAppointments;
    },
    enabled: !!user,
    refetchInterval: 30000,
    retry: 3
  });
}
