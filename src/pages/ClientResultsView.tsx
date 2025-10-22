
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BackButton from '@/components/ui/back-button';
import ProvidersList from '@/components/client/results/ProvidersList';
import ClientPageLayout from '@/components/layout/ClientPageLayout';

const ClientResultsView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q');
  const serviceId = searchParams.get('serviceId');
  const categoryName = searchParams.get('categoryName');

  // If we have serviceId, show providers list
  if (serviceId) {
    return (
      <ClientPageLayout>
        <div className="space-y-6">
          {/* Compact header with back button and centered title */}
          <div className="flex items-center justify-center relative h-14">
            {/* Back button - absolute positioned to the left */}
            <div className="absolute left-0">
              <BackButton onClick={() => navigate(-1)} label="" className="h-10" />
            </div>
            
            {/* Centered title */}
            <h1 className="text-lg font-semibold text-[#2D2D2D]">
              Profesionales
            </h1>
          </div>
          
          <ProvidersList
            categoryName={categoryName || ''} 
            serviceId={serviceId} 
          />
        </div>
      </ClientPageLayout>
    );
  }

  // Default search functionality (for text search)
  return (
    <ClientPageLayout 
      title="Resultados de Búsqueda" 
      subtitle={`Buscando: ${query}`}
    >
      <div className="space-y-6">
        <BackButton onClick={() => navigate(-1)} />
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Funcionalidad de búsqueda en desarrollo
          </p>
        </div>
      </div>
    </ClientPageLayout>
  );
};

export default ClientResultsView;
