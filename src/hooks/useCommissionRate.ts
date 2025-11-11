
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useCommissionRate = () => {
  const { data: commissionRate = 20, isLoading } = useQuery({
    queryKey: ['commission-rate'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('commission_rate')
          .limit(1)
          .maybeSingle();
        
        if (error) {
          logger.warn('Error fetching commission rate, using default', { error });
          return 20; // Default fallback
        }
        
        return data?.commission_rate || 20;
      } catch (error) {
        logger.warn('Error in commission rate query, using default', { error });
        return 20; // Default fallback
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  return {
    commissionRate: Number(commissionRate),
    isLoading
  };
};
