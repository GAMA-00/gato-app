
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Define some helper types to make the code more readable
type AppointmentData = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  apartment?: string;
  provider_id: string;
  client_id: string;
  listing_id: string;
  residencia_id: string;
};

// Define a type guard to check if an object has the properties we need
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function useAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      
      // Consulta basada en el rol del usuario - separación estricta
      if (user.role === 'provider') {
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(`
            *,
            listings (
              title,
              base_price,
              duration,
              service_type_id
            ),
            clients:users!appointments_client_id_fkey (
              id,
              name,
              email,
              phone,
              avatar_url,
              house_number,
              condominium_id,
              residencia_id
            ),
            residencias (
              name,
              address
            )
          `)
          .eq('provider_id', user.id)
          .order('start_time');
          
        if (error) {
          console.error("Error fetching provider appointments:", error);
          throw error;
        }
        
        console.log("Provider appointments raw data:", appointments);
        
        // Verificar si hay datos recibidos
        if (!appointments || appointments.length === 0) {
          console.log("No appointment data received for provider");
          return [];
        }
        
        // Procesar los datos con mejor manejo de tipos
        const enhancedData = appointments.map(appointment => {
          // Asegurar que clients es un objeto válido antes de acceder a sus propiedades
          const clientData = isObject(appointment.clients) ? appointment.clients : {};
          
          return {
            ...appointment,
            clients: clientData
          };
        });
        
        console.log("Provider appointments enhanced:", enhancedData);
        return enhancedData;
      } 
      else if (user.role === 'client') {
        // Para clientes
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(`
            *,
            listings (
              title,
              base_price,
              duration,
              service_type_id
            ),
            providers:users!appointments_provider_id_fkey (
              id,
              name,
              email,
              phone,
              avatar_url
            ),
            residencias (
              name,
              address
            )
          `)
          .eq('client_id', user.id)
          .order('start_time');
          
        if (error) {
          console.error("Error fetching client appointments:", error);
          throw error;
        }
        
        console.log("Client appointments raw data:", appointments);
        
        // Verificar si hay datos recibidos
        if (!appointments || appointments.length === 0) {
          console.log("No appointment data received for client");
          return [];
        }
        
        // Procesar los datos con mejor manejo de tipos
        const enhancedData = appointments.map(appointment => {
          // Asegurar que providers es un objeto válido antes de acceder a sus propiedades
          const providerData = isObject(appointment.providers) ? appointment.providers : {};
          
          return {
            ...appointment,
            providers: providerData
          };
        });
        
        console.log("Client appointments enhanced:", enhancedData);
        return enhancedData;
      }
      
      // Si el rol no coincide, devolver array vacío
      return [];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refrescar cada 30 segundos para comprobar nuevas solicitudes
    retry: 3, // Reintentar 3 veces en caso de error
  });
}
