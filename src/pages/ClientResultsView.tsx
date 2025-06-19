
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
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
        <PageContainer 
          title="Profesionales disponibles" 
          subtitle={categoryName ? `Categoría: ${decodeURIComponent(categoryName)}` : 'Resultados de búsqueda'}
        >
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            
            <ProvidersList 
              categoryName={categoryName || ''} 
              serviceId={serviceId} 
            />
          </div>
        </PageContainer>
      </>
    );
  }

  // Default search functionality (for text search)
  return (
    <>
      <Navbar />
      <PageContainer title="Resultados de Búsqueda" subtitle={`Buscando: ${query}`}>
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Funcionalidad de búsqueda en desarrollo
            </p>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ClientResultsView;
