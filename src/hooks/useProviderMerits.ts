
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

      // Fetch provider's data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('average_rating')
        .eq('id', providerId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user rating:', userError);
      }

      // Fetch rating count to determine if provider is new
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('provider_ratings')
        .select('rating')
        .eq('provider_id', providerId);

      if (ratingsError) {
        console.error('Error fetching ratings data:', ratingsError);
      }

      // Fetch completed jobs count
      const { data: completedJobs, error: jobsError } = await supabase
        .from('appointments')
        .select('id')
        .eq('provider_id', providerId)
        .in('status', ['confirmed', 'completed']);

      if (jobsError) {
        console.error('Error fetching completed jobs:', jobsError);
      }

      // Fetch REAL recurring clients count
      const { data: recurringClients, error: recurringError } = await supabase
        .from('recurring_rules')
        .select('client_id')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .in('recurrence_type', ['weekly', 'biweekly', 'monthly']);

      if (recurringError) {
        console.error('Error fetching recurring clients:', recurringError);
      }

      const completedJobsCount = completedJobs?.length || 0;
      const uniqueRecurringClients = new Set(recurringClients?.map(rule => rule.client_id) || []);
      const recurringClientsCount = uniqueRecurringClients.size;
      const ratingCount = ratingsData?.length || 0;
      
      // Nueva lógica de calificaciones con base de 5 estrellas:
      // - Si el proveedor no tiene calificaciones reales, mostrar 5.0
      // - Si tiene calificaciones, usar el promedio calculado por la base de datos
      //   (que ya incluye la calificación base de 5 estrellas)
      let averageRating = 5.0;
      if (ratingCount > 0 && userData?.average_rating != null) {
        // El promedio ya viene calculado desde la base de datos con la lógica de 5 estrellas base
        averageRating = Number(userData.average_rating);
      }

      // Get provider level based on completed jobs
      const providerLevel = getProviderLevelByJobs(completedJobsCount);

      console.log('Provider merits calculated with 5-star base:', {
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
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false
  });
}
