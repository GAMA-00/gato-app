import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useProviderListing = () => {
  const { user } = useAuth();
  const [firstListingId, setFirstListingId] = useState<string | null>(null);
  const [serviceDuration, setServiceDuration] = useState<number>(60);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFirstListing = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('id, slot_size, standard_duration, duration')
          .eq('provider_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching provider listing:', error);
          return;
        }

        setFirstListingId(data?.id || null);
        // Priorizar slot_size, luego standard_duration, duration como fallback, 60 como último recurso
        const duration = data?.slot_size || data?.standard_duration || data?.duration || 60;
        setServiceDuration(duration);
        console.log('📋 Duración de servicio detectada:', { slot_size: data?.slot_size, standard_duration: data?.standard_duration, duration: data?.duration, final: duration });
      } catch (error) {
        console.error('Error in fetchFirstListing:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFirstListing();
  }, [user?.id]);

  return {
    firstListingId,
    serviceDuration,
    isLoading
  };
};