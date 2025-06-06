
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

      // Fetch listings for this service type
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          base_price,
          duration,
          provider_id,
          gallery_images
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

      // Fetch provider information separately
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

      console.log("Found providers:", providers);

      // Process the data into ProcessedProvider format
      const processedProviders: ProcessedProvider[] = listings.map(listing => {
        const provider = providers?.find(p => p.id === listing.provider_id);
        
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
          serviceDescription: listing.description || '', // Include service description
          experience: provider?.experience_years || 0,
          servicesCompleted: Math.floor(Math.random() * 50) + 10, // Simulated
          recurringClients: Math.floor(Math.random() * 20) + 5, // Simulated
          galleryImages: galleryImages,
          hasCertifications: false, // Would need additional query
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
