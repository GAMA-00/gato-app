
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServiceDetailData, CertificationFile } from './types';
import { ProviderData } from '@/components/client/results/types';
import { useEffect } from 'react';

export const useServiceDetail = (providerId?: string, serviceId?: string, userId?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-detail', serviceId, providerId],
    queryFn: async () => {
      if (!serviceId || !providerId) {
        console.error("Missing serviceId or providerId:", { serviceId, providerId });
        return null;
      }
      
      console.log("Fetching listing details for:", { serviceId, providerId });
      
      // Get listing details
      const { data: listing, error } = await supabase
        .from('listings')
        .select(`
          *,
          provider:provider_id(
            id, 
            name, 
            about_me,
            experience_years,
            average_rating,
            certification_files,
            email,
            phone
          ),
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
        console.error("Error fetching service details:", error);
        toast.error("Error al obtener detalles del servicio");
        throw error;
      }
      
      console.log("Listing data:", listing);
      
      // Get client residence info
      let clientResidencia = null;
      if (userId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('residencia_id, residencias(name, address)')
          .eq('id', userId)
          .maybeSingle();
          
        clientResidencia = clientData?.residencias;
      }
      
      // Process provider data to include hasCertifications and parsed certification files
      const providerData = listing.provider || {} as ProviderData;
      
      // Process certification files
      let certificationFiles: CertificationFile[] = [];
      let galleryImages: string[] = [];
      
      // First check if the listing itself has gallery_images
      if (listing && listing.gallery_images) {
        try {
          // Parse gallery_images if it's a string
          const imagesData = typeof listing.gallery_images === 'string' 
            ? JSON.parse(listing.gallery_images) 
            : listing.gallery_images;
          
          if (Array.isArray(imagesData)) {
            galleryImages = imagesData.map((image: any) => 
              typeof image === 'string' ? image : (image.url || image.downloadUrl || '')
            ).filter(Boolean);
          }
        } catch (error) {
          console.error("Error parsing gallery images:", error);
        }
      }
      
      // If no images found in listing, try fetching from provider certification files as fallback
      if (galleryImages.length === 0 && providerData && providerData.certification_files) {
        try {
          // Parse certification_files if it's a string
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
            galleryImages = filesData
              .filter((file: any) => {
                const fileUrl = file.url || file.downloadUrl || '';
                const fileType = file.type || file.contentType || '';
                return fileType.startsWith('image/') || 
                       fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              })
              .map((file: any) => file.url || file.downloadUrl || '');
          }
        } catch (error) {
          console.error("Error parsing certification files:", error);
        }
      }
      
      // As a last resort, if we have the listing ID, try to fetch images from storage
      if (galleryImages.length === 0 && listing.id) {
        try {
          const { data: storageData, error: storageError } = await supabase
            .storage
            .from('listing_images')
            .list(`${listing.id}/`);
          
          if (!storageError && storageData && storageData.length > 0) {
            galleryImages = storageData
              .filter(item => !item.id.endsWith('/'))
              .map(item => {
                const { data } = supabase
                  .storage
                  .from('listing_images')
                  .getPublicUrl(`${listing.id}/${item.name}`);
                return data.publicUrl;
              });
          }
        } catch (error) {
          console.error("Error fetching images from storage:", error);
        }
      }
      
      console.log("Gallery images found:", galleryImages);
      
      const hasCertifications = certificationFiles.length > 0;
      
      // Parse service variants from JSON string if needed
      let serviceVariants = [];
      if (listing.service_variants) {
        try {
          // Check if it's already an object or needs parsing
          const variantsData = typeof listing.service_variants === 'string' 
            ? JSON.parse(listing.service_variants) 
            : listing.service_variants;
            
          if (Array.isArray(variantsData) && variantsData.length > 0) {
            serviceVariants = variantsData.map((variant: any, index: number) => ({
              id: variant.id || `variant-${index}`,
              name: variant.name || `Opción ${index + 1}`,
              price: parseFloat(variant.price) || listing.base_price,
              duration: parseInt(variant.duration) || listing.duration
            }));
          }
        } catch (error) {
          console.error("Error parsing service variants:", error);
          // Create default variant if parsing fails
          serviceVariants = [{
            id: 'default-variant',
            name: listing.title,
            price: listing.base_price,
            duration: listing.duration
          }];
        }
      }
      
      if (serviceVariants.length === 0) {
        // Create default variant if none exist
        serviceVariants = [{
          id: 'default-variant',
          name: listing.title,
          price: listing.base_price,
          duration: listing.duration
        }];
      }
      
      // Mock data for recurring clients and services completed
      const recurringClients = Math.floor(Math.random() * 10);
      const servicesCompleted = Math.floor(Math.random() * 50) + 10;
      
      return {
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
        servicesCompleted
      } as ServiceDetailData;
    },
    enabled: !!serviceId && !!providerId,
    retry: 1
  });

  useEffect(() => {
    if (error) {
      console.error("Error in service details query:", error);
      toast.error("No se pudo cargar la información del servicio");
    }
  }, [error]);

  return { serviceDetails: data, isLoading, error };
};
