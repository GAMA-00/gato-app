
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServiceDetailData, CertificationFile } from './types';
import { ProviderData } from '@/components/client/results/types';
import { useEffect } from 'react';
import { preloadImages } from '@/hooks/useImagePreload';
import { logger } from '@/utils/logger';

export const useServiceDetail = (providerId?: string, serviceId?: string, userId?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-detail', serviceId, providerId],
    queryFn: async () => {
      if (!serviceId || !providerId) {
        logger.error("Missing serviceId or providerId", { serviceId, providerId });
        return null;
      }
      
      logger.debug("Starting service detail fetch", { serviceId, providerId });
      
      // Get current auth status
      const { data: { session } } = await supabase.auth.getSession();
      logger.debug("Auth session status", { authenticated: !!session });
      
      // Get listing details including gallery_images
      // NOTE: slot_size removed - all slots are now standardized to 60 minutes
      const { data: listing, error } = await supabase
        .from('listings')
        .select(`
          *,
          service_type:service_type_id(
            name,
            category:category_id(
              name,
              label
            )
          )
        `)
        .eq('id', serviceId)
        .eq('provider_id', providerId)
        .single();
        
      if (error) {
        logger.error("Error fetching service details", error);
        toast.error("Error al obtener detalles del servicio");
        throw error;
      }
      
      logger.debug("Listing data fetched successfully", { 
        listingId: listing.id,
        hasGalleryImages: !!listing.gallery_images,
        hasServiceVariants: !!listing.service_variants
      });
      
      // Debug: First check if provider exists in users table without role filter
      logger.debug("Checking provider existence", { providerId });
      const { data: allProviderData, error: allProviderError } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', providerId);
        
      if (allProviderError) {
        logger.error("Error checking provider existence", allProviderError);
      } else {
        logger.debug("Provider check result", { found: allProviderData?.length });
      }
      
      // Get provider data from users table with role filter
      logger.debug("Fetching provider with role filter");
      const { data: providerQueryData, error: providerError } = await supabase
        .from('users')
        .select(`
          id, 
          name, 
          about_me,
          experience_years,
          average_rating,
          certification_files,
          email,
          phone,
          avatar_url,
          role
        `)
        .eq('id', providerId)
        .eq('role', 'provider')
        .maybeSingle();
        
      if (providerError) {
        logger.error("Error fetching provider details", providerError);
      }
      
      logger.debug("Provider data fetched", { 
        found: !!providerQueryData,
        hasCertifications: !!providerQueryData?.certification_files
      });
      
      // If no provider found with role=provider, try without role filter
      let providerData = providerQueryData;
      if (!providerData) {
        logger.debug("Trying fallback provider fetch without role filter");
        const { data: fallbackProviderData, error: fallbackError } = await supabase
          .from('users')
          .select(`
            id, 
            name, 
            about_me,
            experience_years,
            average_rating,
            certification_files,
            email,
            phone,
            avatar_url,
            role
          `)
          .eq('id', providerId)
          .maybeSingle();
          
        if (fallbackError) {
          logger.error("Error fetching fallback provider", fallbackError);
        }
        
        logger.debug("Fallback provider data fetched", { found: !!fallbackProviderData });
        providerData = fallbackProviderData;
      }
      
      // If still no provider found, return null to show error
      if (!providerData) {
        logger.error("Provider not found after all attempts", { providerId });
        return null;
      }
      
      logger.debug("Final provider data", { 
        id: providerData.id,
        name: providerData.name,
        hasAvatar: !!providerData.avatar_url
      });
      
      // Get client residence info if userId provided
      let clientResidencia = null;
      if (userId) {
        logger.debug("Fetching client residence", { userId });
        const { data: clientData } = await supabase
          .from('users')
          .select('residencia_id, residencias(name, address)')
          .eq('id', userId)
          .eq('role', 'client')
          .maybeSingle();
          
        clientResidencia = clientData?.residencias;
      }
      
      // Process provider data to include hasCertifications and parsed certification files
      let certificationFiles: CertificationFile[] = [];
      let galleryImages: string[] = [];
      
      logger.debug("Processing images and certifications");
      
      // Parse certification files if available
      if (providerData.certification_files) {
        try {
          const filesData = typeof providerData.certification_files === 'string' 
            ? JSON.parse(providerData.certification_files) 
            : providerData.certification_files;
          
          if (Array.isArray(filesData)) {
            certificationFiles = filesData.map((file: any) => ({
              name: file.name || file.fileName || 'Documento',
              url: file.url || file.downloadUrl || '',
              type: file.type || file.contentType || 'application/pdf',
              size: file.size || 0
            }));
            
            // Extract image files from certification_files for gallery
            const imageFilesFromCerts = filesData
              .filter((file: any) => {
                const fileType = file.type || file.contentType || '';
                return fileType.startsWith('image/');
              })
              .map((file: any) => file.url || file.downloadUrl || '')
              .filter(Boolean);
            
            if (imageFilesFromCerts.length > 0) {
              galleryImages = [...galleryImages, ...imageFilesFromCerts];
            }
          }
        } catch (error) {
          logger.error("Error parsing certification files", { error });
        }
      }
      
      // Get gallery images from the listing's gallery_images column (PRIORITY)
      if (listing.gallery_images) {
        try {
          const listingGalleryImages = typeof listing.gallery_images === 'string'
            ? JSON.parse(listing.gallery_images)
            : listing.gallery_images;
            
          if (Array.isArray(listingGalleryImages)) {
            const validListingImages = listingGalleryImages.filter(Boolean);
            galleryImages = [...validListingImages, ...galleryImages];
          }
        } catch (error) {
          logger.error("Error parsing gallery images from listing", { error });
        }
      }
      
      // Try to get images from the listing's service_variants gallery_images (FALLBACK)
      if (listing.service_variants) {
        try {
          const serviceVariants = typeof listing.service_variants === 'string' 
            ? JSON.parse(listing.service_variants) 
            : listing.service_variants;
          
          if (serviceVariants && typeof serviceVariants === 'object' && 'gallery_images' in serviceVariants) {
            const imagesData = typeof serviceVariants.gallery_images === 'string'
              ? JSON.parse(serviceVariants.gallery_images)
              : serviceVariants.gallery_images;
              
            if (Array.isArray(imagesData)) {
              const listingImages = imagesData.map((image: any) => 
                typeof image === 'string' ? image : (image.url || image.downloadUrl || '')
              ).filter(Boolean);
              
              galleryImages = [...galleryImages, ...listingImages];
            }
          }
        } catch (error) {
          logger.error("Error parsing gallery images from service variants", { error });
        }
      }
      
      logger.debug("Gallery images processed", { 
        totalCount: galleryImages.length,
        hasProvider: !!providerData.avatar_url
      });
      
      const hasCertifications = certificationFiles.length > 0;
      
      // Parse service variants from JSON string if needed
      let serviceVariants = [];
      if (listing.service_variants) {
        try {
          const variantsData = typeof listing.service_variants === 'string' 
            ? JSON.parse(listing.service_variants) 
            : listing.service_variants;
            
          if (Array.isArray(variantsData) && variantsData.length > 0) {
            serviceVariants = variantsData.map((variant: any, index: number) => ({
              id: variant.id || `variant-${index}`,
              name: variant.name || `Opción ${index + 1}`,
              price: parseFloat(variant.price) || listing.base_price,
              duration: parseInt(variant.duration) || listing.duration,
              additionalPersonPrice: variant.additionalPersonPrice != null ? parseFloat(variant.additionalPersonPrice) : undefined,
              maxPersons: variant.maxPersons != null ? parseInt(variant.maxPersons) : undefined,
            }));
          }
        } catch (error) {
          logger.error("Error parsing service variants", { error });
        }
      }
      
      if (serviceVariants.length === 0) {
        serviceVariants = [{
          id: 'default-variant',
          name: listing.title,
          price: listing.base_price,
          duration: listing.duration
        }];
      }
      
      // Parse custom variable groups from JSON if available
      let customVariableGroups = [];
      if (listing.custom_variable_groups) {
        try {
          customVariableGroups = typeof listing.custom_variable_groups === 'string' 
            ? JSON.parse(listing.custom_variable_groups) 
            : listing.custom_variable_groups;
        } catch (error) {
          logger.error("Error parsing custom variable groups", { error });
        }
      }
      
      // Mock data for recurring clients and services completed
      const recurringClients = Math.floor(Math.random() * 10);
      const servicesCompleted = Math.floor(Math.random() * 50) + 10;
      
      const finalResult = {
        ...listing,
        provider: {
          ...providerData,
          hasCertifications,
          certificationFiles,
          servicesCompleted
        },
        clientResidencia,
        recurringClients,
        serviceVariants,
        galleryImages,
        servicesCompleted,
        custom_variable_groups: customVariableGroups,
        use_custom_variables: listing.use_custom_variables || false
      } as ServiceDetailData;
      
      logger.debug("Service detail result ready", {
        serviceTitle: finalResult.title,
        providerName: finalResult.provider.name,
        variantsCount: finalResult.serviceVariants.length,
        galleryCount: finalResult.galleryImages.length
      });
      
      return finalResult;
    },
    enabled: !!serviceId && !!providerId,
    retry: 1
  });

  useEffect(() => {
    if (error) {
      logger.error("Query error in service details", error);
      toast.error("No se pudo cargar la información del servicio");
    }
  }, [error]);

  // Preload critical images when data is available
  useEffect(() => {
    if (data) {
      const imagesToPreload = [];
      
      // Preload provider avatar with high priority
      if (data.provider?.avatar_url) {
        imagesToPreload.push({
          url: data.provider.avatar_url,
          priority: 'high' as const
        });
      }
      
      // Preload first 2 gallery images with high priority
      if (data.galleryImages && data.galleryImages.length > 0) {
        data.galleryImages.slice(0, 2).forEach(url => {
          imagesToPreload.push({
            url,
            priority: 'high' as const
          });
        });
      }
      
      if (imagesToPreload.length > 0) {
        preloadImages(imagesToPreload);
      }
    }
  }, [data]);

  return { serviceDetails: data, isLoading, error };
};
