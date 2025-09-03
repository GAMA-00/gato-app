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
      console.log(`🔍 Fetching ${limit} most recent comments for provider ${providerId}`);
      
      // Get ratings with comments, joined with appointment data to get client names
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

      console.log('📊 Raw provider comments query result:', { data, error, providerId });

      if (error) {
        console.error('❌ Error fetching provider comments:', error);
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} comments for provider ${providerId}`, data);

      // Transform the data to include client names
      const transformedData = data?.map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        created_at: item.created_at,
        client_id: item.client_id,
        appointment_id: item.appointment_id,
        client_name: (item.appointments as any)?.client_name || 'Cliente anónimo'
      })) as ProviderComment[] || [];

      console.log('🔄 Transformed comments data:', transformedData);
      
      return transformedData;
    },
    enabled: !!providerId,
  });
};

export const useAllProviderComments = (providerId: string) => {
  return useQuery({
    queryKey: ['provider-comments-all', providerId],
    queryFn: async () => {
      console.log(`🔍 Fetching all comments for provider ${providerId}`);
      
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

      console.log('📊 Raw all comments query result:', { data, error, providerId });

      if (error) {
        console.error('❌ Error fetching all provider comments:', error);
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} total comments for provider ${providerId}`, data);

      const transformedData = data?.map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        created_at: item.created_at,
        client_id: item.client_id,
        appointment_id: item.appointment_id,
        client_name: (item.appointments as any)?.client_name || 'Cliente anónimo'
      })) as ProviderComment[] || [];

      console.log('🔄 Transformed all comments data:', transformedData);
      
      return transformedData;
    },
    enabled: false, // Only fetch when explicitly requested
  });
};