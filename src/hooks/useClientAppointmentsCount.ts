import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

// Simple count of future pending/confirmed appointments for the nav badge
export function useClientAppointmentsCount() {
  const { user } = useAuth();

  const { data: count = 0, isLoading } = useQuery({
    queryKey: ['client-appointments-count', user?.id],
    enabled: !!user?.id && user.role === 'client',
    staleTime: 30000,
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await (db as any)
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', new Date().toISOString());
      if (error) return 0;
      return count ?? 0;
    },
  });

  return { count, isLoading };
}
