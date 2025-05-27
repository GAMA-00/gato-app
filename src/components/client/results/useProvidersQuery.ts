
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

      // Query listings for this service type with provider information
      const { data: listings, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          base_price,
          duration,
          description,
          provider_id,
          gallery_images,
          users!provider_id (
            id,
            name,
            avatar,
            about_me,
            experience_years,
            certification_files
          )
        `)
        .eq('service_type_id', serviceId)
        .eq('is_active', true);

      if (error) {
        console.error("Error fetching listings:", error);
        throw error;
      }

      console.log("Raw listings data:", listings);

      if (!listings || listings.length === 0) {
        console.log("No listings found");
        return [];
      }

      // Get provider ratings
      const providerIds = listings.map(listing => listing.provider_id).filter(Boolean);
      const { data: ratingsData } = await supabase
        .from('provider_ratings')
        .select('provider_id, rating, services_completed, recurring_clients')
        .in('provider_id', providerIds);

      console.log("Ratings data:", ratingsData);

      // Process listings into ProcessedProvider format
      const processedProviders: ProcessedProvider[] = listings.map(listing => {
        const provider = listing.users;
        const ratings = ratingsData?.find(r => r.provider_id === listing.provider_id);
        
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
          avatar: provider?.avatar || null,
          rating: ratings?.rating || 0,
          price: listing.base_price || 0,
          duration: listing.duration || 60,
          serviceName: listing.title || 'Servicio',
          serviceId: listing.id,
          aboutMe: provider?.about_me || '',
          experience: provider?.experience_years || 0,
          servicesCompleted: ratings?.services_completed || 0,
          recurringClients: ratings?.recurring_clients || 0,
          galleryImages: allImages,
          hasCertifications: !!provider?.certification_files,
          ratingCount: 0
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
