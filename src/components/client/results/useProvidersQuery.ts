
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProcessedProvider } from './types';
import { logger } from '@/utils/logger';

export const useProvidersQuery = (serviceId: string, categoryName: string) => {
  return useQuery({
    queryKey: ['providers', serviceId, categoryName],
    queryFn: async (): Promise<ProcessedProvider[]> => {
      logger.debug("useProvidersQuery called", { serviceId, categoryName });
      
      if (!serviceId) {
        logger.debug("No serviceId provided, returning empty array");
        return [];
      }

      // Fetch active listings for this service type with provider information
      // NOTE: slot_size removed - all slots are now standardized to 60 minutes
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          base_price,
          duration,
          standard_duration,
          provider_id,
          gallery_images,
          service_variants,
          currency
        `)
        .eq('service_type_id', serviceId)
        .eq('is_active', true);

      if (listingsError) {
        logger.error("Error fetching listings", listingsError);
        throw listingsError;
      }

      if (!listings || listings.length === 0) {
        logger.debug("No listings found for serviceId", { serviceId });
        return [];
      }

      logger.debug("Found listings", { count: listings.length });

      // Get unique provider IDs
      const providerIds = [...new Set(listings.map(listing => listing.provider_id))];
      logger.debug("Provider IDs to fetch", { providerIds });

      // Fetch provider information separately with optimized query
      const { data: providers, error: providersError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          avatar_url,
          about_me,
          experience_years,
          average_rating,
          created_at
        `)
        .in('id', providerIds);

      if (providersError) {
        logger.error("Error fetching providers", providersError);
        throw providersError;
      }

      logger.debug("Fetched providers", { count: providers?.length });

      // Create a map for quick provider lookup
      const providersMap = providers?.reduce((acc, provider) => {
        acc[provider.id] = provider;
        return acc;
      }, {} as Record<string, any>) || {};

      // Fetch recurring clients count using parallel requests for better performance
      const recurringClientsPromises = providerIds.map(async (providerId) => {
        try {
          const { data, error } = await supabase
            .rpc('get_recurring_clients_count', { provider_id: providerId });
            
          if (error) {
            logger.error('Error fetching recurring clients count', { providerId, error });
            return { providerId, count: 0 };
          }
          
          const count = Number(data);
          return { providerId, count: isNaN(count) ? 0 : count };
        } catch (error) {
          logger.error('Error in recurring clients RPC', { providerId, error });
          return { providerId, count: 0 };
        }
      });

      const recurringClientsResults = await Promise.all(recurringClientsPromises);
      const recurringClientsMap = recurringClientsResults.reduce((acc, result) => {
        acc[result.providerId] = result.count;
        return acc;
      }, {} as Record<string, number>);

      // Process the data into ProcessedProvider format
      const processedProviders: ProcessedProvider[] = listings
        .filter(listing => providersMap[listing.provider_id]) // Only include listings with valid provider data
        .map(listing => {
          const provider = providersMap[listing.provider_id];
          
          // Parse gallery images with proper type checking
          let galleryImages: string[] = [];
          try {
            if (listing.gallery_images) {
              if (Array.isArray(listing.gallery_images)) {
                galleryImages = listing.gallery_images.filter((img): img is string => typeof img === 'string');
              } else if (typeof listing.gallery_images === 'string') {
                galleryImages = JSON.parse(listing.gallery_images);
              }
            }
          } catch (e) {
            logger.error("Error parsing gallery images", { error: e });
          }

          // Calculate join date from created_at
          let joinDate: Date | undefined;
          if (provider?.created_at) {
            joinDate = new Date(provider.created_at);
          }

          // Use the optimized rating from database (already includes 5-star base calculation)
          const rating = provider?.average_rating ? Number(provider.average_rating) : 5.0;

          // Get price from first service variant or base_price
          let displayPrice = listing.base_price || 0;
          let firstVariant: any | undefined;
          if (listing.service_variants && Array.isArray(listing.service_variants) && listing.service_variants.length > 0) {
            firstVariant = listing.service_variants[0];
            if (firstVariant && typeof firstVariant === 'object' && 'price' in firstVariant) {
              displayPrice = Number(firstVariant.price) || listing.base_price || 0;
            }
          }

          // Determine real duration: prioritize first variant duration, then listing.duration, then standard_duration, fallback 60
          let variantDuration: number | undefined = undefined;
          if (firstVariant && typeof firstVariant === 'object' && 'duration' in firstVariant) {
            const d = Number((firstVariant as any).duration);
            variantDuration = isNaN(d) ? undefined : d;
          }
          const computedDuration = (variantDuration ?? 0) || Number(listing.duration) || Number(listing.standard_duration) || 60;

          const processedProvider = {
            id: listing.provider_id,
            name: provider?.name || 'Proveedor',
            avatar: provider?.avatar_url && provider.avatar_url.trim() !== '' ? provider.avatar_url : null,
            rating: rating,
            price: displayPrice,
            duration: computedDuration,
            serviceName: listing.title || 'Servicio',
            serviceId: listing.id,
            listingId: listing.id, // Added listing ID for per-service recurring clients count
            aboutMe: provider?.about_me || '',
            serviceDescription: listing.description || '',
            experience: provider?.experience_years || 0,
            servicesCompleted: Math.floor(Math.random() * 50) + 10, // Simulated
            recurringClients: recurringClientsMap[listing.provider_id] || 0,
            galleryImages: galleryImages,
            hasCertifications: false,
            ratingCount: Math.floor(Math.random() * 100) + 10, // Simulated
            joinDate: joinDate,
            currency: (listing.currency as 'USD' | 'CRC') || 'USD'
          };

          logger.debug("Processed provider", {
            name: processedProvider.name,
            id: processedProvider.id,
            listingId: processedProvider.listingId
          });

          return processedProvider;
        });

      logger.debug("Final processed providers", { count: processedProviders.length });
      return processedProviders;
    },
    enabled: !!serviceId,
    staleTime: 0, // Force refetch to get updated avatar URLs
    gcTime: 0, // Don't cache at all to force fresh data
    refetchOnWindowFocus: true, // Refetch when window is focused
    refetchOnMount: true, // Always refetch on mount
    refetchInterval: false // Don't auto-refetch
  });
};
