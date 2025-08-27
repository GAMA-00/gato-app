
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import PageContainer from '@/components/layout/PageContainer';
import ServiceForm from '@/components/services/ServiceForm';
import { useServiceMutations } from '@/hooks/useServiceMutations';
import { Service } from '@/lib/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
            ),
            users!inner(
              about_me,
              experience_years,
              has_certifications,
              certification_files
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
          aboutMe: listingData.users?.about_me || '',
          experienceYears: listingData.users?.experience_years || 0,
          hasCertifications: listingData.users?.has_certifications || false,
          certificationFiles: listingData.users?.certification_files || [],
        };

        console.log('=== SERVICEEDIT DEBUG (FIXED) ===');
        console.log('Raw data from DB:', {
          availability: listingData.availability,
          standard_duration: listingData.standard_duration,
          duration: listingData.duration,
          service_variants: listingData.service_variants,
          residenciaIds: residenciaIds
        });
        console.log('Processed service data:', transformedData);
        console.log('=== END SERVICEEDIT DEBUG ===');

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
    console.log('=== SERVICEEDIT: Updating service ===');
    console.log('Updated service data:', updatedServiceData);
    
    setIsSubmitting(true);
    
    updateListingMutation.mutate({ 
      id: id!, 
      ...updatedServiceData 
    }, {
      onSuccess: (data) => {
        console.log('=== SERVICEEDIT: Mutation successful ===');
        console.log('Updated service data:', data);
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
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
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
