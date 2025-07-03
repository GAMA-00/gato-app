
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import PageContainer from '@/components/layout/PageContainer';
import ServiceForm from '@/components/services/ServiceForm';
import { useServiceMutations } from '@/hooks/useServiceMutations';
import { Service } from '@/lib/types';
import { toast } from 'sonner';

const ServiceCreate = () => {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(true);
  const { createListingMutation } = useServiceMutations();

  const handleSubmit = (serviceData: Partial<Service>) => {
    console.log('=== SERVICECREATE: Creating new service ===');
    console.log('Service data received:', serviceData);
    
    createListingMutation.mutate(serviceData, {
      onSuccess: (data) => {
        console.log('=== SERVICECREATE: Mutation successful ===');
        console.log('Created service data:', data);
        setIsFormOpen(false); // Cerrar el formulario
        toast.success('¡Anuncio creado exitosamente!');
        
        // Navegar después de un pequeño delay para que el usuario vea el mensaje
        setTimeout(() => {
          navigate('/services');
        }, 1000);
      },
      onError: (error) => {
        console.error('=== SERVICECREATE: Mutation failed ===');
        console.error('Error details:', error);
        toast.error('Error al crear el anuncio: ' + (error as Error).message);
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
        />
      </PageContainer>
    </>
  );
};

export default ServiceCreate;
