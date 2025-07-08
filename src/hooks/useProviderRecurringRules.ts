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
        .select(`
          *,
          listings(title)
        `)
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Populate client_name if missing by fetching user data separately
      if (data && data.length > 0) {
        const clientIds = data.map(rule => rule.client_id).filter(Boolean);
        if (clientIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, name')
            .in('id', clientIds);
          
          if (users) {
            const userMap = users.reduce((acc, user) => {
              acc[user.id] = user.name;
              return acc;
            }, {} as Record<string, string>);
            
            data.forEach(rule => {
              if (!rule.client_name && rule.client_id && userMap[rule.client_id]) {
                rule.client_name = userMap[rule.client_id];
              }
            });
          }
        }
      }

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