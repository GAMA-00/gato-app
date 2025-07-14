
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceCard from '@/components/services/ServiceCard';
import { useListings } from '@/hooks/useListings';
import { useServiceMutations } from '@/hooks/useServiceMutations';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Service } from '@/lib/types';
import { toast } from 'sonner';

const Services = () => {
  const { listings, isLoading } = useListings();
  const { deleteListingMutation } = useServiceMutations();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleEditService = (service: Service) => {
    console.log('Edit service:', service);
  };

  const handleDeleteService = (service: Service) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${service.name}"?`)) {
      deleteListingMutation.mutate(service, {
        onSuccess: () => {
          toast.success('Anuncio eliminado exitosamente');
        },
        onError: (error) => {
          toast.error('Error al eliminar el anuncio');
          console.error('Delete error:', error);
        }
      });
    }
  };

  const handleCreateService = () => {
    navigate('/services/create');
  };

  if (isLoading) {
    return (
      <PageLayout title="Mis Servicios" contentClassName="max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 w-full max-w-sm rounded-lg" />
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Mis Servicios" contentClassName="max-w-4xl">
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
        </div>
      )}
    </PageLayout>
  );
};

export default Services;
