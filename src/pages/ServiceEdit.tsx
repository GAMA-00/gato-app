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
        const { data, error } = await supabase
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

        if (error) {
          console.error('Error loading service:', error);
          toast.error('Error al cargar el servicio');
          navigate('/services');
          return;
        }

        // Transformar datos para el formulario
        const transformedData: Service = {
          id: data.id,
          name: data.title,
          description: data.description,
          price: data.base_price,
          duration: data.duration,
          subcategoryId: data.service_type_id,
          category: data.service_types.service_categories.name,
          isPostPayment: data.is_post_payment,
          serviceVariants: Array.isArray(data.service_variants) ? data.service_variants as any[] : [],
          galleryImages: Array.isArray(data.gallery_images) ? data.gallery_images as string[] : [],
          customVariableGroups: Array.isArray(data.custom_variable_groups) ? data.custom_variable_groups as any[] : [],
          useCustomVariables: data.use_custom_variables || false,
          // Load availability from the listing
          availability: data.availability ? (typeof data.availability === 'string' ? JSON.parse(data.availability) : data.availability) : undefined,
          providerId: data.provider_id,
          providerName: '',
          residenciaIds: [],
          createdAt: new Date(data.created_at),
        };

        console.log('=== SERVICEEDIT DEBUG ===');
        console.log('Raw availability from DB:', data.availability);
        console.log('Processed availability:', transformedData.availability);
        console.log('Availability type:', typeof data.availability);
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
        setIsFormOpen(false);
        toast.success('Anuncio actualizado exitosamente');
        navigate('/services');
      },
      onError: (error) => {
        console.error('=== SERVICEEDIT: Mutation failed ===');
        console.error('Error details:', error);
        toast.error('Error al actualizar el anuncio');
        setIsSubmitting(false);
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