
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProviderAchievements, RatingHistory, getProviderLevelByJobs, getNextLevel } from '@/lib/achievementTypes';

export function useProviderAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['provider-achievements', user?.id],
    queryFn: async (): Promise<ProviderAchievements> => {
      if (!user || user.role !== 'provider') {
        throw new Error('User is not a provider');
      }

      console.log('Fetching provider achievements for:', user.id);

      try {
        // Use the new efficient function to get achievements data
        const { data: achievementsData, error: achievementsError } = await supabase
          .rpc('get_provider_achievements_data', { p_provider_id: user.id });

        if (achievementsError) {
          console.error('Error fetching provider achievements data:', achievementsError);
          throw achievementsError;
        }

        const achievementStats = achievementsData?.[0] || {
          completed_jobs_count: 0,
          recurring_clients_count: 0,
          average_rating: 5.0,
          total_ratings: 0
        };

        // Fetch rating history separately for display
        const { data: ratingHistoryData, error: historyError } = await supabase
          .from('provider_ratings')
          .select(`
            id,
            rating,
            comment,
            created_at,
            appointments!inner(
              id,
              client_name,
              start_time,
              listings!inner(base_price, title)
            )
          `)
          .eq('provider_id', user.id)
          .eq('appointments.status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10);

        if (historyError) {
          console.error('Error fetching rating history:', historyError);
        }

        // Build rating history
        const ratingHistory: RatingHistory[] = (ratingHistoryData || []).map(rating => ({
          id: rating.id,
          clientName: rating.appointments?.client_name || 'Cliente',
          appointmentDate: new Date(rating.appointments?.start_time || rating.created_at),
          servicePrice: rating.appointments?.listings?.base_price || 0,
          rating: rating.rating,
          serviceName: rating.appointments?.listings?.title
        }));

        const completedJobs = achievementStats.completed_jobs_count;
        const currentLevelInfo = getProviderLevelByJobs(completedJobs);
        const nextLevelInfo = getNextLevel(currentLevelInfo.level);
        const jobsToNextLevel = nextLevelInfo ? nextLevelInfo.minJobs - completedJobs : 0;

        return {
          totalCompletedJobs: completedJobs,
          currentLevel: currentLevelInfo.level,
          nextLevel: nextLevelInfo?.level || null,
          jobsToNextLevel: Math.max(0, jobsToNextLevel),
          averageRating: parseFloat(achievementStats.average_rating.toFixed(1)),
          ratingHistory,
          recurringClientsCount: achievementStats.recurring_clients_count
        };
      } catch (error) {
        console.error('Error in provider achievements query:', error);
        throw error;
      }
    },
    enabled: !!user && user.role === 'provider',
    staleTime: 60000, // Reduce to 1 minute for more frequent updates
    refetchOnWindowFocus: false
  });
}
