
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
      
      // Debug: First check if provider exists in users table without role filter
      const { data: allProviderData, error: allProviderError } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', providerId);
        
      console.log("All provider data (no role filter):", allProviderData);
      
      // Get provider data from users table
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
          avatar_url
        `)
        .eq('id', providerId)
        .eq('role', 'provider')
        .maybeSingle();
        
      if (providerError) {
        console.error("Error fetching provider details:", providerError);
        toast.error("Error al obtener detalles del proveedor");
        throw providerError;
      }
      
      console.log("Provider data from DB (with role filter):", providerQueryData);
      
      // If no provider found with role=provider, try without role filter
      let providerData = providerQueryData;
      if (!providerData) {
        console.log("Provider not found with role=provider, trying without role filter...");
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
            avatar_url
          `)
          .eq('id', providerId)
          .maybeSingle();
          
        if (fallbackError) {
          console.error("Error fetching fallback provider:", fallbackError);
        }
        
        console.log("Fallback provider data:", fallbackProviderData);
        providerData = fallbackProviderData;
      }
      
      // If still no provider found, return null to show error
      if (!providerData) {
        console.error("Provider not found in database");
        return null;
      }
      
      // Get client residence info if userId provided
      let clientResidencia = null;
      if (userId) {
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
            galleryImages = filesData
              .filter((file: any) => {
                const fileType = file.type || file.contentType || '';
                return fileType.startsWith('image/');
              })
              .map((file: any) => file.url || file.downloadUrl || '')
              .filter(Boolean);
          }
        } catch (error) {
          console.error("Error parsing certification files:", error);
        }
      }
      
      // Try to get images from the listing's service_variants gallery_images
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
          console.error("Error parsing gallery images from listing:", error);
        }
      }
      
      console.log("Gallery images found:", galleryImages);
      console.log("Provider avatar URL:", providerData.avatar_url);
      console.log("Provider name:", providerData.name);
      
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
              duration: parseInt(variant.duration) || listing.duration
            }));
          }
        } catch (error) {
          console.error("Error parsing service variants:", error);
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
