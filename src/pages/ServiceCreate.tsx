
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import PageContainer from '@/components/layout/PageContainer';
import ServiceForm from '@/components/services/ServiceForm';
import { useServiceMutations } from '@/hooks/useServiceMutations';
import { Service } from '@/lib/types';

const ServiceCreate = () => {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(true);
  const { createListingMutation } = useServiceMutations();

  const handleSubmit = (serviceData: Partial<Service>) => {
    console.log('Creating new service:', serviceData);
    createListingMutation.mutate(serviceData, {
      onSuccess: () => {
        navigate('/services');
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
