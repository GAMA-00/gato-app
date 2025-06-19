
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import BackButton from '@/components/ui/back-button';
import Navbar from '@/components/layout/Navbar';
import ProvidersList from '@/components/client/results/ProvidersList';

const ClientResultsView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q');
  const serviceId = searchParams.get('serviceId');
  const categoryName = searchParams.get('categoryName');

  // If we have serviceId, show providers list
  if (serviceId) {
    return (
      <>
        <Navbar />
        <div className="relative">
          {/* Back button positioned in top-left corner */}
          <div className="absolute top-4 left-4 z-10">
            <BackButton onClick={() => navigate(-1)} />
          </div>
          
          <PageContainer 
            title="Profesionales disponibles"
            className="pt-20" // Add top padding to avoid overlap
          >
            <div className="space-y-4">
              <ProvidersList 
                categoryName={categoryName || ''} 
                serviceId={serviceId} 
              />
            </div>
          </PageContainer>
        </div>
      </>
    );
  }

  // Default search functionality (for text search)
  return (
    <>
      <Navbar />
      <div className="relative">
        {/* Back button positioned in top-left corner */}
        <div className="absolute top-4 left-4 z-10">
          <BackButton onClick={() => navigate(-1)} />
        </div>
        
        <PageContainer 
          title="Resultados de Búsqueda" 
          subtitle={`Buscando: ${query}`}
          className="pt-20" // Add top padding to avoid overlap
        >
          <div className="space-y-4">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Funcionalidad de búsqueda en desarrollo
              </p>
            </div>
          </div>
        </PageContainer>
      </div>
    </>
  );
};

export default ClientResultsView;
