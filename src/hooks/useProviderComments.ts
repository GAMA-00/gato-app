import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProviderComment {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client_id: string;
  appointment_id: string;
  client_name?: string;
}

export const useProviderComments = (providerId: string, limit: number = 3) => {
  return useQuery({
    queryKey: ['provider-comments', providerId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_ratings')
        .select(`
          id,
          rating,
          comment,
          created_at,
          client_id,
          appointment_id,
          appointments(client_name)
        `)
        .eq('provider_id', providerId)
        .not('comment', 'is', null)
        .not('comment', 'eq', '')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      const transformedData = data?.map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        created_at: item.created_at,
        client_id: item.client_id,
        appointment_id: item.appointment_id,
        client_name: (item.appointments as any)?.client_name || 'Cliente anónimo'
      })) as ProviderComment[] || [];
      
      return transformedData;
    },
    enabled: !!providerId,
  });
};

export const useAllProviderComments = (providerId: string) => {
  return useQuery({
    queryKey: ['provider-comments-all', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_ratings')
        .select(`
          id,
          rating,
          comment,
          created_at,
          client_id,
          appointment_id,
          appointments(client_name)
        `)
        .eq('provider_id', providerId)
        .not('comment', 'is', null)
        .not('comment', 'eq', '')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const transformedData = data?.map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        created_at: item.created_at,
        client_id: item.client_id,
        appointment_id: item.appointment_id,
        client_name: (item.appointments as any)?.client_name || 'Cliente anónimo'
      })) as ProviderComment[] || [];
      
      return transformedData;
    },
    enabled: false,
  });
};
