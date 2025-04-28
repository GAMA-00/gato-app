
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Query based on user role
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
              profiles:id (
                name,
                phone
              )
            )
          `)
          .eq('provider_id', user.id)
          .order('start_time');
          
        if (error) throw error;
        return data || [];
      } else {
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
              profiles:id (
                name,
                phone
              )
            )
          `)
          .eq('client_id', user.id)
          .order('start_time');
          
        if (error) throw error;
        return data || [];
      }
    },
    enabled: !!user
  });
}
