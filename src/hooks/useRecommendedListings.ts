import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecommendedListing {
  id: string;
  title: string;
  base_price: number;
  currency: string;
  gallery_images: string[] | null;
  provider: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    average_rating: number | null;
  } | null;
  service_type: {
    id: string;
    name: string;
  } | null;
}

// Service types to search for recommendations
const RECOMMENDED_SERVICE_PATTERNS = ['chef', 'manicur', 'tutor', 'flor'];

export const useRecommendedListings = () => {
  return useQuery({
    queryKey: ['recommended-listings'],
    queryFn: async (): Promise<RecommendedListing[]> => {
      // Build OR conditions for service type names
      const orConditions = RECOMMENDED_SERVICE_PATTERNS
        .map(pattern => `name.ilike.%${pattern}%`)
        .join(',');

      // First get matching service type IDs
      const { data: serviceTypes, error: stError } = await supabase
        .from('service_types')
        .select('id, name')
        .or(orConditions);

      if (stError) throw stError;
      if (!serviceTypes?.length) return [];

      const serviceTypeIds = serviceTypes.map(st => st.id);

      // Now fetch active listings for these service types
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          base_price,
          currency,
          gallery_images,
          service_type_id,
          provider_id
        `)
        .eq('is_active', true)
        .in('service_type_id', serviceTypeIds)
        .limit(10);

      if (listingsError) throw listingsError;
      if (!listings?.length) return [];

      // Get provider info from public view (bypasses RLS restrictions on users table)
      const providerIds = [...new Set(listings.map(l => l.provider_id))];
      const { data: providers } = await supabase
        .from('provider_public_profiles')
        .select('id, name, avatar_url, average_rating')
        .in('id', providerIds);

      const providersMap = new Map(providers?.map(p => [p.id, p]) || []);
      const serviceTypesMap = new Map(serviceTypes.map(st => [st.id, st]));

      return listings.map(listing => ({
        id: listing.id,
        title: listing.title,
        base_price: listing.base_price,
        currency: listing.currency,
        gallery_images: listing.gallery_images as string[] | null,
        provider: providersMap.get(listing.provider_id) || null,
        service_type: serviceTypesMap.get(listing.service_type_id) || null,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};
