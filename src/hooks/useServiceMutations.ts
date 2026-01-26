
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Service } from '@/lib/types';
import { toast } from 'sonner';
import { uploadGalleryImages, uploadCertificationFiles } from '@/utils/fileUploadUtils';

interface CreateListingData {
  title: string;
  description: string;
  base_price: number;
  duration: number;
  standard_duration: number;
  // slot_size removed - all slots are now standardized to 60 minutes
  service_type_id: string;
  provider_id: string;
  is_post_payment: boolean;
  currency: 'USD' | 'CRC';
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
      let providerId = serviceData.providerId;
      if (!providerId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user?.id) {
          throw new Error('No se pudo obtener el ID del proveedor autenticado');
        }
        providerId = user.id;
      }

      const galleryImageUrls = await uploadGalleryImages(
        serviceData.galleryImages || [], 
        providerId
      );

      const certificationFilesUrls = await uploadCertificationFiles(
        serviceData.certificationFiles || [],
        providerId,
        serviceData.hasCertifications || false
      );

      const firstVariant = serviceData.serviceVariants?.[0];
      const calculatedDuration = firstVariant?.duration 
        ? Number(firstVariant.duration) 
        : (serviceData.duration ? Number(serviceData.duration) : 60);
      
      const rootPrice = Number(serviceData.price) || 0;
      const calculatedBasePrice = rootPrice > 0 
        ? rootPrice 
        : (firstVariant?.price ? Number(firstVariant.price) : 0);

      if (!serviceData.name?.trim()) {
        throw new Error('El nombre del servicio es requerido');
      }
      if (!serviceData.subcategoryId) {
        throw new Error('La categoría del servicio es requerida');
      }
      if (calculatedDuration < 2 || isNaN(calculatedDuration)) {
        throw new Error(`Duración inválida: ${calculatedDuration}. Debe ser al menos 2 minutos.`);
      }
      if (calculatedBasePrice <= 0 || isNaN(calculatedBasePrice)) {
        throw new Error(`Precio base inválido: ${calculatedBasePrice}. Debe ser mayor a 0.`);
      }

      const listingData: CreateListingData = {
        title: serviceData.name.trim(),
        description: serviceData.description || '',
        base_price: calculatedBasePrice,
        duration: calculatedDuration,
        standard_duration: calculatedDuration,
        // slot_size removed - all slots standardized to 60 minutes (handled by DB default)
        service_type_id: serviceData.subcategoryId,
        provider_id: providerId,
        is_post_payment: serviceData.isPostPayment === true || serviceData.isPostPayment === "ambas",
        currency: serviceData.currency || 'USD',
        service_variants: serviceData.serviceVariants || [],
        gallery_images: galleryImageUrls,
        custom_variable_groups: serviceData.customVariableGroups || [],
        use_custom_variables: serviceData.useCustomVariables || false,
        availability: serviceData.availability || {},
        slot_preferences: serviceData.slotPreferences || {},
      };

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert(listingData)
        .select()
        .single();

      if (listingError) {
        throw listingError;
      }

      const profileUpdateData: any = {
        about_me: serviceData.aboutMe || '',
        experience_years: serviceData.experienceYears || 0,
        has_certifications: serviceData.hasCertifications || false,
        certification_files: certificationFilesUrls.length > 0 ? certificationFilesUrls : null,
      };

      const { error: profileError } = await supabase
        .from('users')
        .update(profileUpdateData)
        .eq('id', providerId);

      if (profileError) {
        // Don't throw - listing creation succeeded
      }

      if (serviceData.residenciaIds && serviceData.residenciaIds.length > 0) {
        const residenciaData = serviceData.residenciaIds.map(residenciaId => ({
          listing_id: listing.id,
          residencia_id: residenciaId
        }));

        const { error: residenciaError } = await supabase
          .from('listing_residencias')
          .insert(residenciaData);

        if (residenciaError) {
          throw residenciaError;
        }
      }

      // Los slots se generan automáticamente via trigger al crear el listing
      // Ya no llamamos RPC de regeneración

      return listing;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
        queryClient.invalidateQueries({ queryKey: ['providers'] }),
        queryClient.invalidateQueries({ queryKey: ['service-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] })
      ]);
      
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['listings'] }),
        queryClient.refetchQueries({ queryKey: ['providers'] })
      ]);
      
      toast.success('Servicio creado exitosamente - Visible para clientes al instante');
    },
    onError: (error) => {
      toast.error('Error al crear el servicio');
    }
  });

  const updateListingMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service> & { id: string }) => {
      const { data: existingListing, error: fetchError } = await supabase
        .from('listings')
        .select('provider_id')
        .eq('id', serviceData.id)
        .single();

      if (fetchError || !existingListing) {
        throw new Error('No se pudo obtener información del listing existente');
      }

      const providerId = existingListing.provider_id;

      const galleryImageUrls = await uploadGalleryImages(
        serviceData.galleryImages || [], 
        providerId
      );

      const certificationFilesUrls = await uploadCertificationFiles(
        serviceData.certificationFiles || [],
        providerId,
        serviceData.hasCertifications || false
      );

      const firstVariant = serviceData.serviceVariants?.[0];
      const calculatedDuration = firstVariant?.duration 
        ? Number(firstVariant.duration) 
        : (serviceData.duration ? Number(serviceData.duration) : undefined);
      
      const rootPrice = serviceData.price ? Number(serviceData.price) : 0;
      const calculatedBasePrice = rootPrice > 0 
        ? rootPrice 
        : (firstVariant?.price ? Number(firstVariant.price) : undefined);

      const listingData: Partial<CreateListingData> = {
        title: serviceData.name,
        description: serviceData.description,
        base_price: calculatedBasePrice,
        duration: calculatedDuration,
        standard_duration: calculatedDuration,
        // slot_size removed - all slots standardized to 60 minutes
        service_type_id: serviceData.subcategoryId,
        is_post_payment: serviceData.isPostPayment === true || serviceData.isPostPayment === "ambas",
        currency: serviceData.currency || 'USD',
        service_variants: serviceData.serviceVariants,
        gallery_images: galleryImageUrls.length > 0 ? galleryImageUrls : undefined,
        custom_variable_groups: serviceData.customVariableGroups,
        use_custom_variables: serviceData.useCustomVariables,
        availability: serviceData.availability,
        slot_preferences: serviceData.slotPreferences,
      };

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .update(listingData)
        .eq('id', serviceData.id)
        .select()
        .single();

      if (listingError) {
        throw listingError;
      }

      const profileUpdateData: any = {
        about_me: serviceData.aboutMe || '',
        experience_years: serviceData.experienceYears || 0,
        has_certifications: serviceData.hasCertifications || false,
        certification_files: certificationFilesUrls.length > 0 ? certificationFilesUrls : null,
      };

      const { error: profileError } = await supabase
        .from('users')
        .update(profileUpdateData)
        .eq('id', providerId);

      if (profileError) {
        throw profileError;
      }

      if (serviceData.residenciaIds !== undefined) {
        await supabase
          .from('listing_residencias')
          .delete()
          .eq('listing_id', serviceData.id);

        if (serviceData.residenciaIds.length > 0) {
          const residenciaData = serviceData.residenciaIds.map(residenciaId => ({
            listing_id: serviceData.id,
            residencia_id: residenciaId
          }));

          const { error: residenciaError } = await supabase
            .from('listing_residencias')
            .insert(residenciaData);

          if (residenciaError) {
            throw residenciaError;
          }
        }
      }

      // Sincronizar slots si cambió la disponibilidad
      if (serviceData.availability) {
        console.log('Sincronizando slots después de actualizar availability...');
        const { error: syncError } = await supabase.rpc('sync_slots_with_availability', {
          p_listing_id: serviceData.id
        });
        if (syncError) {
          console.error('Error sincronizando slots:', syncError);
        } else {
          console.log('Slots sincronizados exitosamente');
        }
      }

      return listing;
    },
    onSuccess: async (updatedListing) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
        queryClient.invalidateQueries({ queryKey: ['providers'] }),
        queryClient.invalidateQueries({ queryKey: ['service-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-slot-management'] }),
        queryClient.invalidateQueries({ queryKey: ['unified-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['availability-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] })
      ]);
      
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['listings'] }),
        queryClient.refetchQueries({ queryKey: ['providers'] }),
        queryClient.refetchQueries({ queryKey: ['service-detail'] }),
        queryClient.refetchQueries({ queryKey: ['provider-profile'] }),
        queryClient.refetchQueries({ queryKey: ['user-profile'] })
      ]);
      
      toast.success('Anuncio actualizado - Perfil y cambios visibles para clientes inmediatamente');
    },
    onError: (error) => {
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
      
      toast.success('Servicio eliminado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar el servicio');
    }
  });

  return {
    createListingMutation,
    updateListingMutation,
    deleteListingMutation
  };
};
