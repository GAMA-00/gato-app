
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCondominiums(residenciaId?: string) {
  return useQuery({
    queryKey: ['condominiums', residenciaId],
    queryFn: async () => {
      if (!residenciaId) return [];
      
      console.log('Fetching condominiums for residencia:', residenciaId);
      
      const { data: condominiums, error } = await supabase
        .from('condominiums')
        .select('id, name')
        .eq('residencia_id', residenciaId)
        .order('name');
        
      if (error) {
        console.error('Error fetching condominiums:', error);
        throw error;
      }
      
      console.log('Condominiums fetched:', condominiums);
      return condominiums || [];
    },
    enabled: !!residenciaId,
    retry: 3
  });
}
