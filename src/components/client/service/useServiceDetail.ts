
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServiceDetailData } from './types';
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
              name
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
      
      // Process provider data to include hasCertifications
      const providerData = listing.provider as ProviderData || {};
      const hasCertifications = providerData.certification_files && 
                             Array.isArray(providerData.certification_files) && 
                             providerData.certification_files.length > 0;
      
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
      
      // Use real gallery images if available, or placeholders
      let galleryImages = [];
      
      // Look for gallery images in provider's certification_files if available
      if (providerData.certification_files) {
        try {
          const certFiles = typeof providerData.certification_files === 'string' 
            ? JSON.parse(providerData.certification_files) 
            : providerData.certification_files;
            
          // Filter only images (files that are not PDFs or other documents)
          const imageFiles = Array.isArray(certFiles) ? certFiles.filter((file: any) => {
            const fileType = file.type || '';
            return fileType.startsWith('image/') || 
                  (file.url && 
                   (file.url.endsWith('.jpg') || 
                    file.url.endsWith('.jpeg') || 
                    file.url.endsWith('.png') || 
                    file.url.endsWith('.webp')));
          }) : [];
          
          galleryImages = imageFiles.map((file: any) => file.url);
        } catch (error) {
          console.error("Error parsing certification files for gallery images:", error);
        }
      }
      
      // If no real images were found, use quality placeholder images
      if (galleryImages.length === 0) {
        galleryImages = [
          'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b',
          'https://images.unsplash.com/photo-1518770660439-4636190af475',
          'https://images.unsplash.com/photo-1461749280684-dccba630e2f6'
        ];
      }
      
      return {
        ...listing,
        provider: {
          ...providerData,
          hasCertifications,
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
