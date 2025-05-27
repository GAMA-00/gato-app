
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
        .select('id, name, avatar_url, about_me, experience_years, certification_files')
        .in('id', providerIds);

      if (providersError) {
        console.error("Error fetching providers:", providersError);
        throw providersError;
      }

      console.log("Providers data:", providers);

      // Get provider ratings - only get what exists in the table
      const { data: ratingsData } = await supabase
        .from('provider_ratings')
        .select('provider_id, rating')
        .in('provider_id', providerIds);

      console.log("Ratings data:", ratingsData);

      // Calculate average ratings and count for each provider
      const providerRatings = ratingsData?.reduce((acc, rating) => {
        if (!acc[rating.provider_id]) {
          acc[rating.provider_id] = { ratings: [], count: 0 };
        }
        acc[rating.provider_id].ratings.push(rating.rating);
        acc[rating.provider_id].count++;
        return acc;
      }, {} as Record<string, { ratings: number[], count: number }>);

      // Create provider lookup map
      const providerMap = providers?.reduce((acc, provider) => {
        acc[provider.id] = provider;
        return acc;
      }, {} as Record<string, any>) || {};

      // Process listings into ProcessedProvider format
      const processedProviders: ProcessedProvider[] = listings.map(listing => {
        const provider = providerMap[listing.provider_id];
        const providerRatingData = providerRatings?.[listing.provider_id];
        const averageRating = providerRatingData?.ratings.length 
          ? providerRatingData.ratings.reduce((sum, r) => sum + r, 0) / providerRatingData.ratings.length 
          : 0;
        
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
          recurringClients: 0, // We don't have this data in the current schema
          galleryImages: allImages,
          hasCertifications: !!provider?.certification_files,
          ratingCount: providerRatingData?.count || 0
        };

        console.log("Processed provider:", processed);
        console.log("Gallery images for provider:", processed.galleryImages);
        
        return processed;
      });

      console.log("Final processed providers:", processedProviders);
      return processedProviders;
    },
    enabled: !!serviceId
  });
};
