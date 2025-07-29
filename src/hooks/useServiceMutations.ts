
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
      console.log('=== INICIO CREACIÓN DE SERVICIO ===');
      console.log('Datos recibidos:', serviceData);
      
      if (!user?.id) {
        console.error('Error: No hay user ID');
        throw new Error('User ID is required');
      }
      
      console.log('User ID:', user.id);
      
      try {
        // Subir archivos de certificación
        console.log('Subiendo certificados...');
        const certificationFilesUrls = await uploadCertificationFiles(
          serviceData.certificationFiles || [],
          user.id,
          serviceData.hasCertifications || false
        );
        console.log('Certificados subidos:', certificationFilesUrls);
        
        // Subir imágenes de galería
        console.log('Subiendo imágenes de galería...');
        const galleryImageUrls = await uploadGalleryImages(
          serviceData.galleryImages || [],
          user.id
        );
        console.log('Imágenes de galería subidas:', galleryImageUrls);
        
        // Actualizar datos del proveedor
        console.log('Actualizando datos del proveedor...');
        await updateProviderData(
          user.id,
          serviceData.aboutMe,
          serviceData.experienceYears,
          certificationFilesUrls,
          serviceData.profileImage
        );
        console.log('Datos del proveedor actualizados');
        
        // Calcular precio y duración base
        let basePrice = serviceData.price || 0;
        let baseDuration = serviceData.duration || 60;
        
        if (serviceData.serviceVariants && serviceData.serviceVariants.length > 0) {
          const baseService = serviceData.serviceVariants[0];
          if (baseService) {
            basePrice = Number(baseService.price) || basePrice;
            baseDuration = Number(baseService.duration) || baseDuration;
          }
        }
        
        console.log('Precio base calculado:', basePrice);
        console.log('Duración base calculada:', baseDuration);
        
        const serviceVariantsJson = serviceData.serviceVariants 
          ? JSON.stringify(serviceData.serviceVariants) 
          : null;
        
        console.log('Variantes de servicio JSON:', serviceVariantsJson);
        
        // Preparar datos para insertar incluyendo availability
        const insertData = {
          title: serviceData.name || '',
          service_type_id: serviceData.subcategoryId || '',
          description: serviceData.description || '',
          base_price: basePrice,
          duration: baseDuration,
          standard_duration: baseDuration, // Required for new slot system
          provider_id: user.id,
          service_variants: serviceVariantsJson,
          gallery_images: galleryImageUrls.length ? JSON.stringify(galleryImageUrls) : null,
          use_custom_variables: serviceData.useCustomVariables || false,
          custom_variable_groups: serviceData.customVariableGroups ? JSON.stringify(serviceData.customVariableGroups) : null,
          availability: serviceData.availability ? JSON.stringify(serviceData.availability) : null
        };
        
        console.log('Datos a insertar en listings:', insertData);
        
        // Insertar en la tabla listings
        const { data, error } = await supabase
          .from('listings')
          .insert(insertData)
          .select()
          .maybeSingle();
          
        if (error) {
          console.error('Error al insertar en listings:', error);
          throw error;
        }
        
        console.log('Listing creado exitosamente:', data);
        
        // Crear asociaciones con residencias
        if (serviceData.residenciaIds?.length && data?.id) {
          console.log('Creando asociaciones con residencias:', serviceData.residenciaIds);
          
          const residenciaAssociations = serviceData.residenciaIds.map(residenciaId => ({
            listing_id: data.id,
            residencia_id: residenciaId
          }));
          
          console.log('Asociaciones a crear:', residenciaAssociations);
          
          const { error: residenciaError } = await supabase
            .from('listing_residencias')
            .insert(residenciaAssociations);
            
          if (residenciaError) {
            console.error('Error al crear asociaciones con residencias:', residenciaError);
            throw residenciaError;
          }
          
          console.log('Asociaciones con residencias creadas exitosamente');
        }
        
        console.log('=== SERVICIO CREADO EXITOSAMENTE ===');
        return data;
        
      } catch (error) {
        console.error('=== ERROR EN CREACIÓN DE SERVICIO ===');
        console.error('Error detallado:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('=== MUTACIÓN EXITOSA ===');
      console.log('Datos del servicio creado:', data);
      
      // Usar setQueryData para actualizar cache directamente sin duplicados
      queryClient.setQueryData(['listings', user?.id], (oldData: any) => {
        if (Array.isArray(oldData)) {
          // Verificar que no existe ya para evitar duplicados
          const exists = oldData.some(item => item.id === data.id);
          if (!exists) {
            return [...oldData, data];
          }
          return oldData;
        }
        return [data];
      });
      
      console.log('Cache actualizado directamente');
      
      // Invalidate user profile queries to update avatar in UI
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['provider-availability', user?.id] });
      
      toast.success('¡Anuncio creado exitosamente!');
    },
    onError: (error) => {
      console.error('Error en mutación:', error);
      toast.error('Error al crear el anuncio: ' + (error as Error).message);
    }
  });
  
  const updateListingMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      console.log('=== INICIO ACTUALIZACIÓN DE SERVICIO ===');
      console.log('Datos recibidos:', serviceData);
      
      if (!serviceData.id) {
        console.error('Error: No hay listing ID');
        throw new Error('Listing ID is required');
      }
      
      try {
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
            standard_duration: baseDuration, // Required for new slot system
            service_variants: serviceVariantsJson,
            gallery_images: galleryImageUrls.length ? JSON.stringify(galleryImageUrls) : null,
            use_custom_variables: serviceData.useCustomVariables || false,
            custom_variable_groups: serviceData.customVariableGroups ? JSON.stringify(serviceData.customVariableGroups) : null,
            availability: serviceData.availability ? JSON.stringify(serviceData.availability) : null
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
        
        console.log('=== SERVICIO ACTUALIZADO EXITOSAMENTE ===');
        
      } catch (error) {
        console.error('=== ERROR EN ACTUALIZACIÓN DE SERVICIO ===');
        console.error('Error detallado:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      queryClient.invalidateQueries({ queryKey: ['provider-availability', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] });
      toast.success('Anuncio actualizado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar el anuncio: ' + (error as Error).message);
    }
  });
  
  const deleteListingMutation = useMutation({
    mutationFn: async (service: Service) => {
      console.log('=== ELIMINANDO SERVICIO ===');
      console.log('Servicio a eliminar:', service);
      
      // First check if there are any appointments associated with this listing
      const { data: appointments, error: checkError } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('listing_id', service.id)
        .limit(1);
        
      if (checkError) {
        console.error('Error checking appointments:', checkError);
        throw checkError;
      }
      
      if (appointments && appointments.length > 0) {
        throw new Error('APPOINTMENTS_EXIST');
      }
      
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', service.id);
        
      if (error) {
        console.error('Error al eliminar servicio:', error);
        throw error;
      }
      
      console.log('Servicio eliminado exitosamente');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      toast.success('Anuncio eliminado exitosamente');
    },
    onError: (error) => {
      const errorMessage = error.message;
      if (errorMessage === 'APPOINTMENTS_EXIST') {
        toast.error('No se puede eliminar este servicio porque tiene citas asociadas. Primero debe cancelar o completar todas las citas relacionadas.');
      } else if (errorMessage.includes('foreign key constraint')) {
        toast.error('No se puede eliminar este servicio porque tiene citas asociadas. Contacte soporte si necesita ayuda.');
      } else {
        toast.error('Error al eliminar el anuncio: ' + errorMessage);
      }
    }
  });
  
  return {
    createListingMutation,
    updateListingMutation,
    deleteListingMutation
  };
};
