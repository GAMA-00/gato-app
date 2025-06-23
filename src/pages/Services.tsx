
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import ServiceCard from '@/components/services/ServiceCard';
import { useListings } from '@/hooks/useListings';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

const Services = () => {
  const { listings, isLoading } = useListings();
  const navigate = useNavigate();

  const handleEditService = (service: any) => {
    console.log('Edit service:', service);
  };

  const handleDeleteService = (service: any) => {
    console.log('Delete service:', service);
  };

  const handleCreateService = () => {
    navigate('/services/new');
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Mis Servicios">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64 w-full max-w-sm rounded-lg" />
              ))}
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Mis Servicios" 
        className="pt-0"
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Botón para crear nuevo anuncio */}
          <div className="mb-8 flex justify-center md:justify-start">
            <Button 
              onClick={handleCreateService}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Crear nuevo anuncio
            </Button>
          </div>

          {/* Grid de servicios centrado */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
            {listings.map((listing) => (
              <div key={listing.id} className="w-full max-w-sm">
                <ServiceCard 
                  service={listing} 
                  onEdit={handleEditService}
                  onDelete={handleDeleteService}
                />
              </div>
            ))}
          </div>

          {/* Mensaje cuando no hay servicios */}
          {listings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Aún no tienes servicios creados
              </p>
              <Button 
                onClick={handleCreateService}
                variant="outline"
                className="flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                Crear tu primer servicio
              </Button>
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
};

export default Services;
