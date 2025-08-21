import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useAppointmentCompletion() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointment-completion', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Call the function to mark past appointments as completed
      const { data, error } = await supabase.rpc('mark_past_appointments_completed');
      
      if (error) {
        console.error('Error marking past appointments as completed:', error);
        return null;
      }
      
      console.log(`Marked ${data} past appointments as completed`);
      return data;
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
    refetchOnWindowFocus: false
  });
}