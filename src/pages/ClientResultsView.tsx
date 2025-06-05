
import React from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import BackButton from '@/components/ui/back-button';
import { useNavigate } from 'react-router-dom';
import ProvidersList from '@/components/client/results/ProvidersList';

const ClientResultsView = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const navigate = useNavigate();
  
  console.log("ClientResultsView rendered with params:", { categoryName, serviceId });
  
  const handleBack = () => {
    navigate(`/client/category/${categoryName}`);
  };
  
  return (
    <PageContainer
      title="Profesionales disponibles"
    >
      <div className="mb-4">
        <BackButton onClick={handleBack} />
      </div>
      
      <div className="max-w-6xl mx-auto">
        <ProvidersList 
          categoryName={categoryName || ''}
          serviceId={serviceId || ''}
        />
      </div>
    </PageContainer>
  );
};

export default ClientResultsView;
