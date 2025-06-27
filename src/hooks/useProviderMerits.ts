
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getProviderLevelByJobs } from '@/lib/achievementTypes';

interface ProviderMerits {
  averageRating: number;
  recurringClientsCount: number;
  completedJobsCount: number;
  ratingCount: number;
  providerLevel: {
    level: string;
    name: string;
    color: string;
  };
}

export function useProviderMerits(providerId?: string) {
  return useQuery({
    queryKey: ['provider-merits', providerId],
    queryFn: async (): Promise<ProviderMerits> => {
      if (!providerId) {
        return {
          averageRating: 5.0,
          recurringClientsCount: 0,
          completedJobsCount: 0,
          ratingCount: 0,
          providerLevel: { level: 'nuevo', name: 'Nuevo', color: '#3B82F6' }
        };
      }

      console.log('Fetching provider merits for:', providerId);

      // Optimized parallel queries for better performance
      const [userResponse, ratingsResponse, appointmentsResponse, recurringResponse] = await Promise.all([
        // Get provider's average rating from users table (already calculated by database function)
        supabase
          .from('users')
          .select('average_rating')
          .eq('id', providerId)
          .single(),
        
        // Get rating count only
        supabase
          .from('provider_ratings')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', providerId),

        // Get completed jobs count
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .in('status', ['confirmed', 'completed']),

        // Get recurring clients count using the existing RPC function
        supabase.rpc('get_recurring_clients_count', { provider_id: providerId })
      ]);

      // Handle errors gracefully
      if (userResponse.error && userResponse.error.code !== 'PGRST116') {
        console.error('Error fetching user rating:', userResponse.error);
      }

      if (ratingsResponse.error) {
        console.error('Error fetching ratings count:', ratingsResponse.error);
      }

      if (appointmentsResponse.error) {
        console.error('Error fetching appointments count:', appointmentsResponse.error);
      }

      if (recurringResponse.error) {
        console.error('Error fetching recurring clients:', recurringResponse.error);
      }

      // Extract data with defaults
      const completedJobsCount = appointmentsResponse.count || 0;
      const ratingCount = ratingsResponse.count || 0;
      const recurringClientsCount = Number(recurringResponse.data) || 0;

      // Simplified rating logic with 5-star base system:
      // - If no ratings exist: show 5.0 (the base rating)
      // - If ratings exist: use the average_rating from database (already calculated with 5-star base)
      let averageRating = 5.0;
      if (ratingCount > 0 && userResponse.data?.average_rating != null) {
        averageRating = Number(userResponse.data.average_rating);
      }

      // Get provider level based on completed jobs
      const providerLevel = getProviderLevelByJobs(completedJobsCount);

      console.log('Provider merits calculated:', {
        averageRating,
        recurringClientsCount,
        completedJobsCount,
        ratingCount,
        providerLevel: providerLevel.name
      });

      return {
        averageRating,
        recurringClientsCount,
        completedJobsCount,
        ratingCount,
        providerLevel
      };
    },
    enabled: !!providerId,
    staleTime: 60000, // Reduced to 1 minute for faster updates
    refetchOnWindowFocus: true, // Enable refetch on focus for real-time feel
    refetchInterval: 120000 // Refetch every 2 minutes to keep data fresh
  });
}
