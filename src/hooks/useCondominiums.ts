
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger';

export function useCondominiums(residenciaId?: string) {
  return useQuery({
    queryKey: ['condominiums', residenciaId],
    queryFn: async () => {
      if (!residenciaId) return [];
      
      logger.debug('Fetching condominiums', { residenciaId });
      
      const { data: condominiums, error } = await supabase
        .from('condominiums')
        .select('id, name')
        .eq('residencia_id', residenciaId)
        .order('name');
        
      if (error) {
        logger.error('Error fetching condominiums', { error, residenciaId });
        throw error;
      }
      
      logger.debug('Condominiums fetched', { count: condominiums?.length, residenciaId });
      return condominiums || [];
    },
    enabled: !!residenciaId,
    retry: 3
  });
}
