
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
      <ClientPageLayout title="Profesionales disponibles">
        <div className="space-y-6">
          <BackButton onClick={() => navigate(-1)} />
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
