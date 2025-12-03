
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
  slot_size: number;
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
      console.log('Service data received:', serviceData);

      // Get provider_id securely from auth if not provided
      let providerId = serviceData.providerId;
      if (!providerId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user?.id) {
          throw new Error('No se pudo obtener el ID del proveedor autenticado');
        }
        providerId = user.id;
        console.log('Using authenticated user ID as provider_id:', providerId);
      }

      // Upload gallery images first
      const galleryImageUrls = await uploadGalleryImages(
        serviceData.galleryImages || [], 
        providerId
      );

      // Upload certification files if provided
      const certificationFilesUrls = await uploadCertificationFiles(
        serviceData.certificationFiles || [],
        providerId,
        serviceData.hasCertifications || false
      );

      // ✅ CORREGIDO: Calcular duration desde la primera variante con fallback
      const firstVariant = serviceData.serviceVariants?.[0];
      const calculatedDuration = firstVariant?.duration 
        ? Number(firstVariant.duration) 
        : (serviceData.duration ? Number(serviceData.duration) : 60);
      
      // ✅ CORREGIDO: Calcular base_price desde la primera variante si el precio raíz es 0
      const rootPrice = Number(serviceData.price) || 0;
      const calculatedBasePrice = rootPrice > 0 
        ? rootPrice 
        : (firstVariant?.price ? Number(firstVariant.price) : 0);

      // ✅ VALIDACIÓN: Verificar campos críticos antes de insertar
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
        slot_size: Number(serviceData.slotSize ?? calculatedDuration),
        service_type_id: serviceData.subcategoryId,
        provider_id: providerId,
        is_post_payment: serviceData.isPostPayment === true || serviceData.isPostPayment === "ambas",
        service_variants: serviceData.serviceVariants || [],
        gallery_images: galleryImageUrls,
        custom_variable_groups: serviceData.customVariableGroups || [],
        use_custom_variables: serviceData.useCustomVariables || false,
        availability: serviceData.availability || {},
        slot_preferences: serviceData.slotPreferences || {},
      };

      console.log('=== VALIDATED LISTING DATA ===');
      console.log('title:', listingData.title);
      console.log('service_type_id:', listingData.service_type_id);
      console.log('standard_duration:', listingData.standard_duration);
      console.log('base_price:', listingData.base_price);
      console.log('Full listing data:', listingData);

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

      // Update provider profile data
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
        console.warn('Error updating provider profile:', profileError);
        // Don't throw - listing creation succeeded
      }

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

      // Regenerate slots for the new listing
      const { error: rpcError } = await supabase.rpc('regenerate_slots_for_listing', {
        p_listing_id: listing.id
      });

      if (rpcError) {
        console.warn('Error regenerating slots for new listing:', rpcError);
        // Don't throw - listing creation succeeded
      }

      return listing;
    },
    onSuccess: async () => {
      console.log('✅ Listing creado exitosamente - invalidando caches para perspectiva del cliente');
      
      // Invalidar TODAS las queries relevantes para refresco inmediato en cliente
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
      
      // Forzar refetch inmediato de datos críticos para clientes
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['listings'] }),
        queryClient.refetchQueries({ queryKey: ['providers'] })
      ]);
      
      console.log('🔄 Todas las queries invalidadas - cambios reflejados en vista de clientes');
      toast.success('Servicio creado exitosamente - Visible para clientes al instante');
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

      // Get provider_id from the existing listing
      const { data: existingListing, error: fetchError } = await supabase
        .from('listings')
        .select('provider_id')
        .eq('id', serviceData.id)
        .single();

      if (fetchError || !existingListing) {
        throw new Error('No se pudo obtener información del listing existente');
      }

      const providerId = existingListing.provider_id;

      // Upload new gallery images and preserve existing ones
      const galleryImageUrls = await uploadGalleryImages(
        serviceData.galleryImages || [], 
        providerId
      );

      // Upload certification files if provided
      const certificationFilesUrls = await uploadCertificationFiles(
        serviceData.certificationFiles || [],
        providerId,
        serviceData.hasCertifications || false
      );

      // ✅ CORREGIDO: Calcular duration desde la primera variante con fallback
      const firstVariant = serviceData.serviceVariants?.[0];
      const calculatedDuration = firstVariant?.duration 
        ? Number(firstVariant.duration) 
        : (serviceData.duration ? Number(serviceData.duration) : undefined);
      
      // ✅ CORREGIDO: Calcular base_price desde la primera variante si el precio raíz es 0
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
        slot_size: serviceData.slotSize ? Number(serviceData.slotSize) : calculatedDuration,
        service_type_id: serviceData.subcategoryId,
        is_post_payment: serviceData.isPostPayment === true || serviceData.isPostPayment === "ambas",
        service_variants: serviceData.serviceVariants,
        gallery_images: galleryImageUrls.length > 0 ? galleryImageUrls : undefined,
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

      // Update provider profile data - CRITICAL FOR PROFILE STEP
      console.log('=== UPDATING PROVIDER PROFILE ===');
      const profileUpdateData: any = {
        about_me: serviceData.aboutMe || '',
        experience_years: serviceData.experienceYears || 0,
        has_certifications: serviceData.hasCertifications || false,
        certification_files: certificationFilesUrls.length > 0 ? certificationFilesUrls : null,
      };

      console.log('Profile data to update:', profileUpdateData);

      const { error: profileError } = await supabase
        .from('users')
        .update(profileUpdateData)
        .eq('id', providerId);

      if (profileError) {
        console.error('❌ Error updating provider profile:', profileError);
        throw profileError; // This is critical - profile update must succeed
      }

      console.log('✅ Provider profile updated successfully');

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

      // Regenerate slots if duration changed - CRITICAL FOR AVAILABILITY
      if (serviceData.duration) {
        console.log('=== REGENERATING SLOTS FOR DURATION CHANGE ===');
        const { error: rpcError } = await supabase.rpc('regenerate_slots_for_listing', {
          p_listing_id: serviceData.id
        });

        if (rpcError) {
          console.warn('⚠️ Error regenerating slots:', rpcError);
          // Don't throw - listing update succeeded
        } else {
          console.log('✅ Slots regenerated successfully');
        }
      }

      return listing;
    },
    onSuccess: async (updatedListing) => {
      console.log('✅ Listing actualizado exitosamente:', updatedListing);
      
      // Invalidar TODAS las queries relevantes para refresco inmediato en CLIENTE
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
      
      // Forzar refetch inmediato de datos críticos para CLIENTES
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['listings'] }),
        queryClient.refetchQueries({ queryKey: ['providers'] }),
        queryClient.refetchQueries({ queryKey: ['service-detail'] }),
        queryClient.refetchQueries({ queryKey: ['provider-profile'] }),
        queryClient.refetchQueries({ queryKey: ['user-profile'] })
      ]);
      
      console.log('🔄 PERFIL PROFESIONAL + LISTINGS sincronizados - cambios reflejados AL INSTANTE en vista de clientes');
      toast.success('Anuncio actualizado - Perfil y cambios visibles para clientes inmediatamente');
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
