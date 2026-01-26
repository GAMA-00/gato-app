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
        // NOTE: slot_size removed - all slots are now standardized to 60 minutes
        const { data, error } = await supabase
          .from('listings')
          .select('id, standard_duration, duration')
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
        // STANDARDIZED: All slots are now 60 minutes - slot_size variable removed
        const duration = 60; // Fixed 1-hour slots
        setServiceDuration(duration);
        console.log('📋 Duración de slot estandarizada:', { serviceDuration: duration });
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