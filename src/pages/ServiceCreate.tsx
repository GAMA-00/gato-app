
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import PageContainer from '@/components/layout/PageContainer';
import ServiceForm from '@/components/services/ServiceForm';
import { useServiceMutations } from '@/hooks/useServiceMutations';
import { Service } from '@/lib/types';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

const ServiceCreate = () => {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createListingMutation } = useServiceMutations();

  const handleSubmit = (serviceData: Partial<Service>) => {
    logger.info('Creating new service', { serviceData });
    
    // Validación básica antes de enviar
    if (!serviceData.name?.trim()) {
      toast.error('El nombre del servicio es requerido');
      return;
    }
    if (!serviceData.subcategoryId) {
      toast.error('Debes seleccionar una categoría de servicio');
      return;
    }
    
    setIsSubmitting(true);
    
    createListingMutation.mutate(serviceData, {
      onSuccess: (data) => {
        logger.info('✅ Service creation successful', { listingId: data?.id });
        toast.success('¡Anuncio creado exitosamente!');
        setIsFormOpen(false);
        navigate('/services');
      },
      onError: (error: any) => {
        logger.error('❌ Service creation failed', { 
          message: error?.message, 
          details: error 
        });
        const errorMessage = error?.message || 'Error desconocido';
        toast.error(`Error al crear el anuncio: ${errorMessage}`);
      },
      onSettled: () => {
        setIsSubmitting(false);
      }
    });
  };

  const handleClose = () => {
    navigate('/services');
  };

  return (
    <>
      <Navbar />
      <PageContainer title="Crear Nuevo Anuncio">
        <ServiceForm
          isOpen={isFormOpen}
          onClose={handleClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </PageContainer>
    </>
  );
};

export default ServiceCreate;
