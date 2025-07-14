
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

      // Fetch appointments and recurring clients count in parallel
      const [appointmentsResponse, recurringClientsResponse] = await Promise.all([
        // Fetch ALL completed appointments throughout history (no date restriction)
        // This ensures the achievement system counts all work done historically, not just current month
        supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            status,
            client_name,
            listings!inner(base_price, title),
            provider_ratings(rating)
          `)
          .eq('provider_id', user.id)
          .in('status', ['completed'])  // Only count actually completed jobs for achievements
          .order('start_time', { ascending: false }),

        // Get recurring clients count
        supabase.rpc('get_recurring_clients_count', { provider_id: user.id })
      ]);

      const { data: appointments, error } = appointmentsResponse;

      if (error) {
        console.error('Error fetching provider achievements:', error);
        throw error;
      }

      const { error: recurringError } = recurringClientsResponse;
      if (recurringError) {
        console.error('Error fetching recurring clients count:', recurringError);
      }

      const recurringClientsCount = recurringClientsResponse.data || 0;

      const completedJobs = appointments?.length || 0;
      const currentLevelInfo = getProviderLevelByJobs(completedJobs);
      const nextLevelInfo = getNextLevel(currentLevelInfo.level);

      // Calculate average rating - filter appointments that have ratings
      const ratingsData = appointments?.filter(app => app.provider_ratings && app.provider_ratings.rating) || [];
      const averageRating = ratingsData.length > 0
        ? ratingsData.reduce((sum, app) => sum + (app.provider_ratings?.rating || 0), 0) / ratingsData.length
        : 5.0; // Default to 5.0 for new providers

      // Build rating history
      const ratingHistory: RatingHistory[] = ratingsData.map(appointment => ({
        id: appointment.id,
        clientName: appointment.client_name || 'Cliente',
        appointmentDate: new Date(appointment.start_time),
        servicePrice: appointment.listings?.base_price || 0,
        rating: appointment.provider_ratings?.rating || 0,
        serviceName: appointment.listings?.title
      }));

      const jobsToNextLevel = nextLevelInfo ? nextLevelInfo.minJobs - completedJobs : 0;

      return {
        totalCompletedJobs: completedJobs,
        currentLevel: currentLevelInfo.level,
        nextLevel: nextLevelInfo?.level || null,
        jobsToNextLevel: Math.max(0, jobsToNextLevel),
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingHistory,
        recurringClientsCount
      };
    },
    enabled: !!user && user.role === 'provider',
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false
  });
}
