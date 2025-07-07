
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createListingMutation } = useServiceMutations();

  const handleSubmit = (serviceData: Partial<Service>) => {
    console.log('=== SERVICECREATE: Creating new service ===');
    console.log('Service data received:', serviceData);
    
    setIsSubmitting(true);
    
    createListingMutation.mutate(serviceData, {
      onSuccess: (data) => {
        console.log('=== SERVICECREATE: Mutation successful ===');
        console.log('Created service data:', data);
        setIsFormOpen(false);
        navigate('/services');
      },
      onError: (error) => {
        console.error('=== SERVICECREATE: Mutation failed ===');
        console.error('Error details:', error);
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
