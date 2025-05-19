
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Define some helper types to make the code more readable
type AvatarData = {
  avatar_url?: string | null;
};

export function useAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      
      // Query basada en el rol del usuario - separación estricta
      if (user.role === 'provider') {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            listings (
              title,
              base_price,
              duration,
              service_type_id
            ),
            clients:client_id (
              id,
              name,
              email,
              phone,
              avatar_url,
              house_number,
              condominium_name:condominiums(name)
            ),
            residencias (
              name,
              address
            ),
            users:client_id (
              avatar_url
            )
          `)
          .eq('provider_id', user.id)
          .order('start_time');
          
        if (error) {
          console.error("Error fetching provider appointments:", error);
          throw error;
        }
        
        // Enriquecer los datos con información de usuarios para asegurar que tenemos avatars
        const enhancedData = data?.map(appointment => {
          // Ensure we have objects even if they're empty
          const clientData = appointment.clients || {};
          const userData = appointment.users || {};
          
          // Safely access avatar_url with optional chaining and nullish coalescing
          const clientAvatarUrl = clientData?.avatar_url;
          const userAvatarUrl = userData?.avatar_url;
          
          return {
            ...appointment,
            clients: {
              ...(appointment.clients || {}),
              avatar_url: clientAvatarUrl || userAvatarUrl || null
            }
          };
        });
        
        // Log de los datos para verificar
        console.log("Provider appointments enhanced:", enhancedData);
        return enhancedData || [];
      } else if (user.role === 'client') {
        // Para clientes
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            listings (
              title,
              base_price,
              duration,
              service_type_id
            ),
            providers:provider_id (
              id,
              name,
              email,
              phone,
              avatar_url
            ),
            residencias (
              name,
              address
            ),
            users:provider_id (
              avatar_url
            )
          `)
          .eq('client_id', user.id)
          .order('start_time');
          
        if (error) {
          console.error("Error fetching client appointments:", error);
          throw error;
        }
        
        // Enriquecer los datos con información de usuarios para asegurar que tenemos avatars
        const enhancedData = data?.map(appointment => {
          // Ensure we have objects even if they're empty
          const providerData = appointment.providers || {};
          const userData = appointment.users || {};
          
          // Safely access avatar_url with optional chaining and nullish coalescing
          const providerAvatarUrl = providerData?.avatar_url;
          const userAvatarUrl = userData?.avatar_url;
          
          return {
            ...appointment,
            providers: {
              ...(appointment.providers || {}),
              avatar_url: providerAvatarUrl || userAvatarUrl || null
            }
          };
        });
        
        return enhancedData || [];
      }
      
      // Si el rol no coincide, devolver array vacío
      return [];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refrescar cada 30 segundos para comprobar nuevas solicitudes
    retry: 3, // Reintentar 3 veces en caso de error
  });
}
