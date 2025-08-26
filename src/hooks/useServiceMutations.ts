
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Service } from '@/lib/types';
import { toast } from 'sonner';

interface CreateListingData {
  title: string;
  description: string;
  base_price: number;
  duration: number;
  standard_duration: number;
  service_type_id: string;
  provider_id: string;
  is_post_payment: boolean;
  service_variants?: any[];
  gallery_images?: string[];
  custom_variable_groups?: any[];
  use_custom_variables?: boolean;
  availability?: any;
  slot_preferences?: any;
}

interface UpdateListingData extends Partial<CreateListingData> {
  id: string;
}

export const useServiceMutations = () => {
  const queryClient = useQueryClient();

  const createListingMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      console.log('=== CREATING LISTING ===');
      console.log('Service data:', serviceData);

      // Convert galleryImages to strings only
      const processedGalleryImages = serviceData.galleryImages ? 
        serviceData.galleryImages
          .map(img => typeof img === 'string' ? img : '')
          .filter(url => url !== '') : [];

      const listingData: CreateListingData = {
        title: serviceData.name!,
        description: serviceData.description!,
        base_price: Number(serviceData.price),
        duration: Number(serviceData.duration), // Mantener por compatibilidad
        standard_duration: Number(serviceData.duration), // Fuente de verdad
        service_type_id: serviceData.subcategoryId!,
        provider_id: serviceData.providerId!,
        is_post_payment: serviceData.isPostPayment === true || serviceData.isPostPayment === "ambas",
        service_variants: serviceData.serviceVariants || [],
        gallery_images: processedGalleryImages,
        custom_variable_groups: serviceData.customVariableGroups || [],
        use_custom_variables: serviceData.useCustomVariables || false,
        availability: serviceData.availability || {},
        slot_preferences: serviceData.slotPreferences || {},
      };

      console.log('Listing data to insert:', listingData);

      // Insertar el listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert(listingData)
        .select()
        .single();

      if (listingError) {
        console.error('Error creating listing:', listingError);
        throw listingError;
      }

      console.log('Listing created:', listing);

      // Insertar las residencias asociadas
      if (serviceData.residenciaIds && serviceData.residenciaIds.length > 0) {
        const residenciaData = serviceData.residenciaIds.map(residenciaId => ({
          listing_id: listing.id,
          residencia_id: residenciaId
        }));

        const { error: residenciaError } = await supabase
          .from('listing_residencias')
          .insert(residenciaData);

        if (residenciaError) {
          console.error('Error inserting residencias:', residenciaError);
          throw residenciaError;
        }
      }

      return listing;
    },
    onSuccess: () => {
      // Invalidar todas las queries relevantes
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
      queryClient.invalidateQueries({ queryKey: ['provider-slots'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-slots'] });
      toast.success('Servicio creado exitosamente');
    },
    onError: (error) => {
      console.error('Error creating service:', error);
      toast.error('Error al crear el servicio');
    }
  });

  const updateListingMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service> & { id: string }) => {
      console.log('=== UPDATING LISTING ===');
      console.log('Service data:', serviceData);

      // Convert galleryImages to strings only
      const processedGalleryImages = serviceData.galleryImages ? 
        serviceData.galleryImages
          .map(img => typeof img === 'string' ? img : '')
          .filter(url => url !== '') : undefined;

      const listingData: Partial<CreateListingData> = {
        title: serviceData.name,
        description: serviceData.description,
        base_price: serviceData.price ? Number(serviceData.price) : undefined,
        duration: serviceData.duration ? Number(serviceData.duration) : undefined, // Mantener por compatibilidad
        standard_duration: serviceData.duration ? Number(serviceData.duration) : undefined, // Fuente de verdad
        service_type_id: serviceData.subcategoryId,
        is_post_payment: serviceData.isPostPayment === true || serviceData.isPostPayment === "ambas",
        service_variants: serviceData.serviceVariants,
        gallery_images: processedGalleryImages,
        custom_variable_groups: serviceData.customVariableGroups,
        use_custom_variables: serviceData.useCustomVariables,
        availability: serviceData.availability,
        slot_preferences: serviceData.slotPreferences,
      };

      console.log('Listing data to update:', listingData);

      // Actualizar el listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .update(listingData)
        .eq('id', serviceData.id)
        .select()
        .single();

      if (listingError) {
        console.error('Error updating listing:', listingError);
        throw listingError;
      }

      console.log('Listing updated:', listing);

      // Actualizar las residencias asociadas
      if (serviceData.residenciaIds !== undefined) {
        // Eliminar asociaciones existentes
        await supabase
          .from('listing_residencias')
          .delete()
          .eq('listing_id', serviceData.id);

        // Insertar nuevas asociaciones
        if (serviceData.residenciaIds.length > 0) {
          const residenciaData = serviceData.residenciaIds.map(residenciaId => ({
            listing_id: serviceData.id,
            residencia_id: residenciaId
          }));

          const { error: residenciaError } = await supabase
            .from('listing_residencias')
            .insert(residenciaData);

          if (residenciaError) {
            console.error('Error updating residencias:', residenciaError);
            throw residenciaError;
          }
        }
      }

      return listing;
    },
    onSuccess: async (updatedListing) => {
      console.log('✅ Listing actualizado exitosamente:', updatedListing);
      
      // Invalidar TODAS las queries relevantes para asegurar consistencia total
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-slot-management'] }),
        queryClient.invalidateQueries({ queryKey: ['unified-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['availability-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] })
      ]);
      
      // Forzar refetch inmediato de datos críticos
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['listings'] }),
        queryClient.refetchQueries({ queryKey: ['provider-availability'] })
      ]);
      
      console.log('🔄 Todas las queries invalidadas y refetcheadas');
      toast.success('Servicio actualizado - Todas las secciones sincronizadas');
    },
    onError: (error) => {
      console.error('Error updating service:', error);
      toast.error('Error al actualizar el servicio');
    }
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;
    },
    onSuccess: async () => {
      // Invalidar TODAS las queries relevantes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-slot-management'] }),
        queryClient.invalidateQueries({ queryKey: ['unified-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['availability-settings'] })
      ]);
      
      console.log('🔄 Caches invalidados después de eliminar servicio');
      toast.success('Servicio eliminado exitosamente');
    },
    onError: (error) => {
      console.error('Error deleting service:', error);
      toast.error('Error al eliminar el servicio');
    }
  });

  return {
    createListingMutation,
    updateListingMutation,
    deleteListingMutation
  };
};
