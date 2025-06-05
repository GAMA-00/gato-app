
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProcessedProvider, ProviderData } from './types';

export const useProvidersQuery = (serviceId: string, categoryName: string) => {
  return useQuery({
    queryKey: ['providers', serviceId, categoryName],
    queryFn: async (): Promise<ProcessedProvider[]> => {
      console.log("=== PROVIDERS QUERY DEBUG ===");
      console.log("Querying providers for serviceId:", serviceId);
      console.log("Category:", categoryName);
      
      if (!serviceId) {
        console.log("No serviceId provided, returning empty array");
        return [];
      }

      // First, get listings for this service type
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          base_price,
          duration,
          description,
          provider_id,
          gallery_images
        `)
        .eq('service_type_id', serviceId)
        .eq('is_active', true);

      if (listingsError) {
        console.error("Error fetching listings:", listingsError);
        throw listingsError;
      }

      console.log("Raw listings data:", listings);

      if (!listings || listings.length === 0) {
        console.log("No listings found");
        return [];
      }

      // Get unique provider IDs
      const providerIds = [...new Set(listings.map(listing => listing.provider_id))];
      console.log("Provider IDs:", providerIds);

      // Fetch user data for providers separately
      const { data: providers, error: providersError } = await supabase
        .from('users')
        .select('id, name, avatar_url, about_me, experience_years, certification_files, average_rating')
        .in('id', providerIds);

      if (providersError) {
        console.error("Error fetching providers:", providersError);
        throw providersError;
      }

      console.log("Providers data:", providers);

      // Get recurring clients count for each provider
      const recurringClientsPromises = providerIds.map(async (providerId) => {
        const { data, error } = await supabase
          .rpc('get_recurring_clients_count', { provider_id: providerId });
        
        if (error) {
          console.error('Error fetching recurring clients count for provider:', providerId, error);
          return { providerId, count: 0 };
        }
        
        return { providerId, count: Number(data) || 0 };
      });

      const recurringClientsData = await Promise.all(recurringClientsPromises);
      const recurringClientsMap = recurringClientsData.reduce((acc, { providerId, count }) => {
        acc[providerId] = count;
        return acc;
      }, {} as Record<string, number>);

      // Create provider lookup map
      const providerMap = providers?.reduce((acc, provider) => {
        acc[provider.id] = provider;
        return acc;
      }, {} as Record<string, any>) || {};

      // Process listings into ProcessedProvider format
      const processedProviders: ProcessedProvider[] = listings.map(listing => {
        const provider = providerMap[listing.provider_id];
        const recurringClients = recurringClientsMap[listing.provider_id] || 0;
        
        // Use actual rating or default to 5.0 for new providers
        const averageRating = provider?.average_rating && provider.average_rating > 0 
          ? provider.average_rating 
          : 5.0;
        
        // Parse gallery images
        let galleryImages: string[] = [];
        try {
          if (listing.gallery_images) {
            const parsed = typeof listing.gallery_images === 'string' 
              ? JSON.parse(listing.gallery_images)
              : listing.gallery_images;
            galleryImages = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          console.error("Error parsing gallery images for listing:", listing.id, e);
        }

        // Parse certification files for additional images
        let certificationImages: string[] = [];
        try {
          if (provider?.certification_files) {
            const certFiles = typeof provider.certification_files === 'string' 
              ? JSON.parse(provider.certification_files)
              : provider.certification_files;
            
            if (Array.isArray(certFiles)) {
              certificationImages = certFiles
                .filter((file: any) => {
                  const fileUrl = file.url || file.downloadUrl || '';
                  const fileType = file.type || file.contentType || '';
                  return fileUrl && (fileType.startsWith('image/') || 
                         fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i));
                })
                .map((file: any) => file.url || file.downloadUrl || '')
                .filter(Boolean);
            }
          }
        } catch (e) {
          console.error("Error parsing certification files for provider:", provider?.id, e);
        }

        // Combine gallery images with certification images
        const allImages = [...galleryImages, ...certificationImages];

        const processed: ProcessedProvider = {
          id: provider?.id || listing.provider_id,
          name: provider?.name || 'Proveedor',
          avatar: provider?.avatar_url || null,
          rating: averageRating,
          price: listing.base_price || 0,
          duration: listing.duration || 60,
          serviceName: listing.title || 'Servicio',
          serviceId: listing.id,
          aboutMe: provider?.about_me || '',
          experience: provider?.experience_years || 0,
          servicesCompleted: 0, // We don't have this data in the current schema
          recurringClients: recurringClients,
          galleryImages: allImages,
          hasCertifications: !!provider?.certification_files,
          ratingCount: 0 // We'll calculate this separately if needed
        };

        console.log("Processed provider:", processed);
        console.log("Gallery images for provider:", processed.galleryImages);
        console.log("Recurring clients for provider:", recurringClients);
        
        return processed;
      });

      console.log("Final processed providers:", processedProviders);
      return processedProviders;
    },
    enabled: !!serviceId
  });
};
