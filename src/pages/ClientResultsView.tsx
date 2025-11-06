
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ProvidersList from '@/components/client/results/ProvidersList';
import ClientPageLayout from '@/components/layout/ClientPageLayout';
import { useProvidersQuery } from '@/components/client/results/useProvidersQuery';

const ClientResultsView = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const serviceId = searchParams.get('serviceId');
  const categoryName = searchParams.get('categoryName');

  // Use the query to get provider count (hook must be at top level)
  const { data: providers, isLoading } = useProvidersQuery(serviceId || '', categoryName || '');
  const providerCount = providers?.length || 0;

  // If we have serviceId, show providers list
  if (serviceId) {
    return (
      <ClientPageLayout>
        <div className="space-y-6">
          {/* Title with counter - centered */}
          <h1 className="text-lg font-semibold text-[#2D2D2D] text-center">
            {isLoading ? (
              'Profesionales Disponibles'
            ) : (
              `Profesionales Disponibles: ${providerCount}`
            )}
          </h1>
          
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
