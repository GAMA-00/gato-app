
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAppointments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          listings!inner(
            title,
            service_type_id,
            service_types(name)
          ),
          users!appointments_client_id_fkey(
            name,
            phone,
            email,
            condominium_name,
            house_number
          ),
          residencias(
            name
          )
        `)
        .or(`provider_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
};
