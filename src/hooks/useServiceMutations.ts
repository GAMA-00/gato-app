
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Service } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { uploadCertificationFiles, uploadGalleryImages, updateProviderData } from '@/utils/fileUploadUtils';

export const useServiceMutations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const createListingMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      if (!user?.id) throw new Error('User ID is required');
      
      const certificationFilesUrls = await uploadCertificationFiles(
        serviceData.certificationFiles || [],
        user.id,
        serviceData.hasCertifications || false
      );
      
      const galleryImageUrls = await uploadGalleryImages(
        serviceData.galleryImages || [],
        user.id
      );
      
      await updateProviderData(
        user.id,
        serviceData.aboutMe,
        serviceData.experienceYears,
        certificationFilesUrls
      );
      
      let basePrice = serviceData.price || 0;
      let baseDuration = serviceData.duration || 60;
      
      if (serviceData.serviceVariants && serviceData.serviceVariants.length > 0) {
        const baseService = serviceData.serviceVariants[0];
        if (baseService) {
          basePrice = Number(baseService.price) || basePrice;
          baseDuration = Number(baseService.duration) || baseDuration;
        }
      }
      
      const serviceVariantsJson = serviceData.serviceVariants 
        ? JSON.stringify(serviceData.serviceVariants) 
        : null;
      
      const { data, error } = await supabase
        .from('listings')
        .insert({
          title: serviceData.name || '',
          service_type_id: serviceData.subcategoryId || '',
          description: serviceData.description || '',
          base_price: basePrice,
          duration: baseDuration,
          provider_id: user.id,
          service_variants: serviceVariantsJson,
          gallery_images: galleryImageUrls.length ? JSON.stringify(galleryImageUrls) : null
        })
        .select()
        .maybeSingle();
        
      if (error) throw error;
      
      if (serviceData.residenciaIds?.length && data?.id) {
        const residenciaAssociations = serviceData.residenciaIds.map(residenciaId => ({
          listing_id: data.id,
          residencia_id: residenciaId
        }));
        
        const { error: residenciaError } = await supabase
          .from('listing_residencias')
          .insert(residenciaAssociations);
          
        if (residenciaError) throw residenciaError;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      toast.success('Anuncio creado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear el anuncio: ' + (error as Error).message);
    }
  });
  
  const updateListingMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      if (!serviceData.id) throw new Error('Listing ID is required');
      
      const certificationFilesUrls = await uploadCertificationFiles(
        serviceData.certificationFiles || [],
        user?.id || '',
        serviceData.hasCertifications || false
      );
      
      const galleryImageUrls = await uploadGalleryImages(
        serviceData.galleryImages || [],
        user?.id || ''
      );
      
      if (user?.id && (serviceData.aboutMe !== undefined || 
                        serviceData.experienceYears !== undefined || 
                        serviceData.hasCertifications !== undefined)) {
        let finalCertificationFiles = null;
        
        if (serviceData.hasCertifications) {
          if (certificationFilesUrls.length > 0) {
            finalCertificationFiles = JSON.stringify(certificationFilesUrls);
          } else if (certificationFilesUrls.length === 0 && serviceData.certificationFiles?.length === 0) {
            finalCertificationFiles = null;
          } else {
            const { data: providerData } = await supabase
              .from('users')
              .select('certification_files')
              .eq('id', user.id)
              .maybeSingle();
              
            finalCertificationFiles = providerData?.certification_files || null;
          }
        } else {
          finalCertificationFiles = null;
        }
        
        const { error: updateProviderError } = await supabase
          .from('users')
          .update({
            about_me: serviceData.aboutMe,
            experience_years: serviceData.experienceYears,
            certification_files: finalCertificationFiles
          })
          .eq('id', user.id);
          
        if (updateProviderError) {
          console.error('Error updating provider info:', updateProviderError);
        }
      }
      
      let basePrice = serviceData.price || 0;
      let baseDuration = serviceData.duration || 60;
      
      if (serviceData.serviceVariants && serviceData.serviceVariants.length > 0) {
        const baseService = serviceData.serviceVariants[0];
        if (baseService) {
          basePrice = Number(baseService.price) || basePrice;
          baseDuration = Number(baseService.duration) || baseDuration;
        }
      }
      
      const serviceVariantsJson = serviceData.serviceVariants 
        ? JSON.stringify(serviceData.serviceVariants) 
        : null;
      
      const { error } = await supabase
        .from('listings')
        .update({
          title: serviceData.name,
          service_type_id: serviceData.subcategoryId,
          description: serviceData.description,
          base_price: basePrice,
          duration: baseDuration,
          service_variants: serviceVariantsJson,
          gallery_images: galleryImageUrls.length ? JSON.stringify(galleryImageUrls) : null
        })
        .eq('id', serviceData.id);
        
      if (error) throw error;
      
      const { error: deleteError } = await supabase
        .from('listing_residencias')
        .delete()
        .eq('listing_id', serviceData.id);
        
      if (deleteError) throw deleteError;
      
      if (serviceData.residenciaIds?.length) {
        const residenciaAssociations = serviceData.residenciaIds.map(residenciaId => ({
          listing_id: serviceData.id!,
          residencia_id: residenciaId
        }));
        
        const { error: residenciaError } = await supabase
          .from('listing_residencias')
          .insert(residenciaAssociations);
          
        if (residenciaError) throw residenciaError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      toast.success('Anuncio actualizado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar el anuncio: ' + (error as Error).message);
    }
  });
  
  const deleteListingMutation = useMutation({
    mutationFn: async (service: Service) => {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', service.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      toast.success('Anuncio eliminado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar el anuncio: ' + (error as Error).message);
    }
  });
  
  return {
    createListingMutation,
    updateListingMutation,
    deleteListingMutation
  };
};
