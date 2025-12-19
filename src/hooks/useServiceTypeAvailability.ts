import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ServiceTypeAvailability {
  availableServiceTypeIds: Set<string>;
  providerCountByServiceType: Map<string, number>;
  isLoading: boolean;
}

export const useServiceTypeAvailability = (): ServiceTypeAvailability => {
  const { data, isLoading } = useQuery({
    queryKey: ['service-type-availability'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('service_type_id')
        .eq('is_active', true);

      if (error) throw error;

      // Count providers per service type
      const countMap = new Map<string, number>();
      (data || []).forEach((listing) => {
        const currentCount = countMap.get(listing.service_type_id) || 0;
        countMap.set(listing.service_type_id, currentCount + 1);
      });

      return countMap;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const availableServiceTypeIds = new Set<string>(data?.keys() || []);
  const providerCountByServiceType = data || new Map<string, number>();

  return {
    availableServiceTypeIds,
    providerCountByServiceType,
    isLoading,
  };
};
