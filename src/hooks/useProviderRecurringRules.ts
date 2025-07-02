import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProviderRecurringRules = (providerId?: string) => {
  return useQuery({
    queryKey: ['provider-recurring-rules', providerId],
    queryFn: async () => {
      if (!providerId) {
        return [];
      }

      console.log('Fetching recurring rules for provider:', providerId);

      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recurring rules:', error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} active recurring rules`);
      return data || [];
    },
    enabled: !!providerId,
    staleTime: 60000, // 1 minute
  });
};