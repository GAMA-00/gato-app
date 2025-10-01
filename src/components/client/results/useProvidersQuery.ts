
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProcessedProvider } from './types';

export const useProvidersQuery = (serviceId: string, categoryName: string) => {
  return useQuery({
    queryKey: ['providers', serviceId, categoryName],
    queryFn: async (): Promise<ProcessedProvider[]> => {
      console.log("useProvidersQuery called with:", { serviceId, categoryName });
      
      if (!serviceId) {
        console.log("No serviceId provided, returning empty array");
        return [];
      }

      // Fetch active listings for this service type with provider information
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          base_price,
          duration,
          provider_id,
          gallery_images,
          service_variants
        `)
        .eq('service_type_id', serviceId)
        .eq('is_active', true);

      if (listingsError) {
        console.error("Error fetching listings:", listingsError);
        throw listingsError;
      }

      if (!listings || listings.length === 0) {
        console.log("No listings found for serviceId:", serviceId);
        return [];
      }

      console.log("Found listings:", listings);

      // Get unique provider IDs
      const providerIds = [...new Set(listings.map(listing => listing.provider_id))];
      console.log("Provider IDs to fetch:", providerIds);

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
        console.error("Error fetching providers:", providersError);
        throw providersError;
      }

      console.log("Fetched providers with avatar data:", providers?.map(p => ({
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url
      })));

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
            console.error('Error fetching recurring clients count for provider:', providerId, error);
            return { providerId, count: 0 };
          }
          
          const count = Number(data);
          return { providerId, count: isNaN(count) ? 0 : count };
        } catch (error) {
          console.error('Error in recurring clients RPC for provider:', providerId, error);
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
            console.error("Error parsing gallery images:", e);
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
          if (listing.service_variants && Array.isArray(listing.service_variants) && listing.service_variants.length > 0) {
            const firstVariant = listing.service_variants[0];
            if (firstVariant && typeof firstVariant === 'object' && 'price' in firstVariant) {
              displayPrice = Number(firstVariant.price) || listing.base_price || 0;
            }
          }

          const processedProvider = {
            id: listing.provider_id,
            name: provider?.name || 'Proveedor',
            avatar: provider?.avatar_url && provider.avatar_url.trim() !== '' ? provider.avatar_url : null,
            rating: rating,
            price: displayPrice,
            duration: listing.duration || 60,
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
            joinDate: joinDate
          };

          console.log("Processed provider:", {
            name: processedProvider.name,
            avatar: processedProvider.avatar,
            id: processedProvider.id,
            listingId: processedProvider.listingId
          });

          return processedProvider;
        });

      console.log("Final processed providers:", processedProviders);
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
