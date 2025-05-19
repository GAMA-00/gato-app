
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      
      // Query based on user role - strict separation
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
            )
          `)
          .eq('provider_id', user.id)
          .order('start_time');
          
        if (error) {
          console.error("Error fetching provider appointments:", error);
          throw error;
        }
        
        // Log the data to check what we're getting
        console.log("Provider appointments:", data);
        return data || [];
      } else if (user.role === 'client') {
        // For clients
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
            )
          `)
          .eq('client_id', user.id)
          .order('start_time');
          
        if (error) {
          console.error("Error fetching client appointments:", error);
          throw error;
        }
        return data || [];
      }
      
      // If role doesn't match, return empty array
      return [];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds to check for new requests
  });
}
