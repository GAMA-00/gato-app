
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services (
            name,
            base_price,
            duration
          ),
          profiles!appointments_client_id_fkey (
            name
          )
        `)
        .order('start_time');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });
}
