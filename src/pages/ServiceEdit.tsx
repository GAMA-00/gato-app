
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import PageContainer from '@/components/layout/PageContainer';
import ServiceForm from '@/components/services/ServiceForm';
import { useServiceMutations } from '@/hooks/useServiceMutations';
import { Service } from '@/lib/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import LoadingScreen from '@/components/common/LoadingScreen';

const ServiceEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceData, setServiceData] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { updateListingMutation } = useServiceMutations();

  // Cargar datos del servicio
  useEffect(() => {
    const loadServiceData = async () => {
      if (!id) {
        toast.error('ID de servicio no válido');
        navigate('/services');
        return;
      }

      try {
        // Obtener el listing con todos los campos necesarios
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select(`
            *,
            service_types!inner(
              id,
              name,
              service_categories!inner(
                id,
                name,
                label
              )
            )
          `)
          .eq('id', id)
          .single();

        if (listingError) {
          console.error('Error loading listing:', listingError);
          toast.error('Error al cargar el servicio');
          navigate('/services');
          return;
        }

        // Obtener los datos del perfil del proveedor por separado
        const { data: providerData, error: providerError } = await supabase
          .from('users')
          .select('about_me, experience_years, has_certifications, certification_files')
          .eq('id', listingData.provider_id)
          .single();

        if (providerError) {
          console.error('Error loading provider profile:', providerError);
        }

        // Obtener las residencias asociadas al listing
        const { data: residenciasData, error: residenciasError } = await supabase
          .from('listing_residencias')
          .select('residencia_id')
          .eq('listing_id', id);

        if (residenciasError) {
          console.error('Error loading residencias:', residenciasError);
        }

        const residenciaIds = residenciasData?.map(r => r.residencia_id) || [];

        // Transformar datos para el formulario - usar standard_duration como fuente de verdad
        const transformedData: Service = {
          id: listingData.id,
          name: listingData.title,
          description: listingData.description,
          price: listingData.base_price,
          duration: listingData.standard_duration, // Usar standard_duration en lugar de duration
          subcategoryId: listingData.service_type_id,
          category: listingData.service_types.service_categories.name,
          isPostPayment: listingData.is_post_payment,
          
          // Parsear service_variants como array de objetos
          serviceVariants: Array.isArray(listingData.service_variants) 
            ? listingData.service_variants as any[]
            : (typeof listingData.service_variants === 'string' && listingData.service_variants.trim() !== '')
              ? JSON.parse(listingData.service_variants)
              : [{ 
                  id: 'default-variant', 
                  name: listingData.title || 'Servicio básico', 
                  price: listingData.base_price, 
                  duration: listingData.standard_duration 
                }],
          
          // Parsear gallery_images como array de strings
          galleryImages: Array.isArray(listingData.gallery_images) 
            ? listingData.gallery_images as string[]
            : (typeof listingData.gallery_images === 'string' && listingData.gallery_images.trim() !== '')
              ? JSON.parse(listingData.gallery_images)
              : [],
          
          // Parsear custom_variable_groups como array de objetos
          customVariableGroups: Array.isArray(listingData.custom_variable_groups) 
            ? listingData.custom_variable_groups as any[]
            : (typeof listingData.custom_variable_groups === 'string' && listingData.custom_variable_groups.trim() !== '')
              ? JSON.parse(listingData.custom_variable_groups)
              : [],
          
          useCustomVariables: listingData.use_custom_variables || false,
          
          // Parsear availability como objeto
          availability: listingData.availability 
            ? (typeof listingData.availability === 'string' 
                ? JSON.parse(listingData.availability) 
                : listingData.availability)
            : {
                monday: { enabled: false, timeSlots: [] },
                tuesday: { enabled: false, timeSlots: [] },
                wednesday: { enabled: false, timeSlots: [] },
                thursday: { enabled: false, timeSlots: [] },
                friday: { enabled: false, timeSlots: [] },
                saturday: { enabled: false, timeSlots: [] },
                sunday: { enabled: false, timeSlots: [] }
              },
          
          // Parsear slot_preferences como objeto
          slotPreferences: listingData.slot_preferences 
            ? (typeof listingData.slot_preferences === 'string' 
                ? JSON.parse(listingData.slot_preferences) 
                : listingData.slot_preferences)
            : {},
          
          providerId: listingData.provider_id,
          providerName: '',
          residenciaIds: residenciaIds, // Usar los IDs obtenidos de la consulta
          createdAt: new Date(listingData.created_at),
          
          // Campos del perfil profesional
          aboutMe: providerData?.about_me || '',
          experienceYears: providerData?.experience_years || 0,
          hasCertifications: providerData?.has_certifications || false,
          certificationFiles: Array.isArray(providerData?.certification_files) 
            ? providerData.certification_files 
            : (providerData?.certification_files ? [providerData.certification_files] : []),
        };

        logger.debug('Service data loaded', { 
          rawData: { availability: listingData.availability, standard_duration: listingData.standard_duration },
          processedData: transformedData 
        });

        setServiceData(transformedData);
      } catch (error) {
        console.error('Error loading service:', error);
        toast.error('Error al cargar el servicio');
        navigate('/services');
      } finally {
        setIsLoading(false);
      }
    };

    loadServiceData();
  }, [id, navigate]);

  const handleSubmit = (updatedServiceData: Partial<Service>) => {
    logger.info('Updating service', { serviceId: id, updatedServiceData });
    
    setIsSubmitting(true);
    
    updateListingMutation.mutate({ 
      id: id!, 
      ...updatedServiceData 
    }, {
      onSuccess: (data) => {
        logger.info('Service update successful', { data });
        setIsSubmitting(false);
        setIsFormOpen(false);
        toast.success('Anuncio actualizado exitosamente');
        navigate('/services');
      },
      onError: (error) => {
        console.error('=== SERVICEEDIT: Mutation failed ===');
        console.error('Error details:', error);
        setIsSubmitting(false);
        toast.error('Error al actualizar el anuncio');
      }
    });
  };

  const handleClose = () => {
    navigate('/services');
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Cargando...">
          <LoadingScreen 
            message="Cargando información del servicio..."
            fullScreen={false}
            className="min-h-[400px]"
          />
        </PageContainer>
      </>
    );
  }

  if (!serviceData) {
    return (
      <>
        <Navbar />
        <PageContainer title="Servicio no encontrado">
          <div className="text-center py-12">
            <p className="text-muted-foreground">El servicio no se pudo cargar.</p>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageContainer title="Editar Anuncio">
        <ServiceForm
          isOpen={isFormOpen}
          onClose={handleClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          initialData={serviceData}
        />
      </PageContainer>
    </>
  );
};

export default ServiceEdit;
