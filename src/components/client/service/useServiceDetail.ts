
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
      
      // Create service variants from the JSON data or use default
      let serviceVariants = [];
      if (listing.service_variants && Array.isArray(listing.service_variants) && listing.service_variants.length > 0) {
        serviceVariants = listing.service_variants.map((variant: any, index: number) => ({
          id: variant.id || `variant-${index}`,
          name: variant.name || `Opción ${index + 1}`,
          price: parseFloat(variant.price) || listing.base_price,
          duration: parseInt(variant.duration) || listing.duration
        }));
      } else {
        // Create default variant if none exist
        serviceVariants = [{
          id: 'default-variant',
          name: listing.title,
          price: listing.base_price,
          duration: listing.duration
        }];
      }
      
      // Mock data
      const recurringClients = Math.floor(Math.random() * 10);
      const servicesCompleted = Math.floor(Math.random() * 50) + 10;
      
      // Mock gallery images for demo (replace with actual gallery images)
      const galleryImages = [
        'https://placehold.co/800x600?text=Servicio+1',
        'https://placehold.co/800x600?text=Servicio+2',
        'https://placehold.co/800x600?text=Servicio+3'
      ];
      
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
