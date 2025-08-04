import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useProviderListing = () => {
  const { user } = useAuth();
  const [firstListingId, setFirstListingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFirstListing = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('id')
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
    isLoading
  };
};