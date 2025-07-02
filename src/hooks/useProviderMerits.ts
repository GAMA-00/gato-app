
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

      // Fetch all ratings for this provider to calculate accurate average
      const { data: ratings, error: ratingsError } = await supabase
        .from('provider_ratings')
        .select('rating')
        .eq('provider_id', providerId);

      if (ratingsError) {
        console.error('Error fetching ratings:', ratingsError);
      }

      // Optimized parallel queries for other data
      const [appointmentsResponse, recurringResponse] = await Promise.all([
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
      if (appointmentsResponse.error) {
        console.error('Error fetching appointments count:', appointmentsResponse.error);
      }

      if (recurringResponse.error) {
        console.error('Error fetching recurring clients:', recurringResponse.error);
      }

      // Calculate data with defaults
      const completedJobsCount = appointmentsResponse.count || 0;
      const recurringClientsCount = Number(recurringResponse.data) || 0;
      const ratingCount = ratings?.length || 0;

      // Calculate average rating with 5-star base system
      let averageRating = 5.0;
      
      if (ratingCount > 0 && ratings) {
        // Apply the 5-star base formula: (5 + sum of ratings) / (count + 1)
        const sumOfRatings = ratings.reduce((sum, rating) => sum + rating.rating, 0);
        averageRating = (5.0 + sumOfRatings) / (ratingCount + 1);
        averageRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
      }

      // Get provider level based on completed jobs
      const providerLevel = getProviderLevelByJobs(completedJobsCount);

      console.log('Provider merits calculated:', {
        averageRating,
        recurringClientsCount,
        completedJobsCount,
        ratingCount,
        providerLevel: providerLevel.name,
        ratingsData: ratings
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
    staleTime: 1000, // Very short stale time for immediate updates
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnMount: true,
    refetchIntervalInBackground: true // Continue refetching even when page is not focused
  });
}
