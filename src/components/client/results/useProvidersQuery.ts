
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
          service_variants,
          users!listings_provider_id_fkey (
            id,
            name,
            avatar_url,
            about_me,
            experience_years,
            average_rating,
            created_at
          )
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

      // Get unique provider IDs for recurring clients count
      const providerIds = [...new Set(listings.map(listing => listing.provider_id))];

      // Fetch recurring clients count for each provider
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
        .filter(listing => listing.users) // Only include listings with valid user data
        .map(listing => {
          const provider = listing.users;
          
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

          return {
            id: listing.provider_id,
            name: provider?.name || 'Proveedor',
            avatar: provider?.avatar_url || null,
            rating: provider?.average_rating || 5.0,
            price: listing.base_price || 0,
            duration: listing.duration || 60,
            serviceName: listing.title || 'Servicio',
            serviceId: listing.id,
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
        });

      console.log("Processed providers:", processedProviders);
      return processedProviders;
    },
    enabled: !!serviceId
  });
};
