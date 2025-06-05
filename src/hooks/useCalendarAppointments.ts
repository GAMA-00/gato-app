
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth } from 'date-fns';

export const useCalendarAppointments = (currentDate: Date) => {
  const { user } = useAuth();
  
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  
  return useQuery({
    queryKey: ['calendar-appointments', user?.id, startDate.toISOString(), endDate.toISOString()],
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
        .eq('provider_id', user.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching calendar appointments:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
};
