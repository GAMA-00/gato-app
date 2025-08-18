
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

      // Optimized parallel queries for provider data
      const [appointmentsResponse, recurringResponse, userResponse, ratingCountResponse] = await Promise.all([
        // Get completed jobs count
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .in('status', ['confirmed', 'completed']),

        // Get recurring clients count using the existing RPC function
        supabase.rpc('get_recurring_clients_count', { provider_id: providerId }),

        // Get provider's average rating from users table (already calculated correctly)
        supabase
          .from('users')
          .select('average_rating')
          .eq('id', providerId)
          .single(),

        // Get rating count from completed appointments only by joining tables
        supabase
          .from('provider_ratings')
          .select('id, appointments!inner(status)', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .eq('appointments.status', 'completed')
      ]);

      // Handle errors gracefully
      if (appointmentsResponse.error) {
        console.error('Error fetching appointments count:', appointmentsResponse.error);
      }

      if (recurringResponse.error) {
        console.error('Error fetching recurring clients:', recurringResponse.error);
      }

      if (userResponse.error) {
        console.error('Error fetching user rating:', userResponse.error);
      }

      if (ratingCountResponse.error) {
        console.error('Error fetching rating count:', ratingCountResponse.error);
      }

      // Calculate data with defaults
      const completedJobsCount = appointmentsResponse.count || 0;
      const recurringClientsCount = Number(recurringResponse.data) || 0;
      const ratingCount = ratingCountResponse.count || 0;

      // Use the average rating from users table (already calculated correctly with completed appointments only)
      const averageRating = userResponse.data?.average_rating || 5.0;

      // Get provider level based on completed jobs
      const providerLevel = getProviderLevelByJobs(completedJobsCount);

      console.log('Provider merits calculated:', {
        averageRating,
        recurringClientsCount,
        completedJobsCount,
        ratingCount,
        providerLevel: providerLevel.name,
        userAverageRating: userResponse.data?.average_rating
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
    staleTime: 300000, // 5 minutes - much longer stale time
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: false, // Don't auto-refetch
    refetchOnMount: true,
    refetchIntervalInBackground: false // Don't refetch in background
  });
}
