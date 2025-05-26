
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/PageContainer';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceForm from '@/components/services/ServiceForm';
import { Service } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useListings } from '@/hooks/useListings';
import { useServiceMutations } from '@/hooks/useServiceMutations';

const Services = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const { listings, isLoading } = useListings();
  const { createListingMutation, updateListingMutation, deleteListingMutation } = useServiceMutations();
  
  const filteredListings = listings.filter(
    service => 
      service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.subcategoryId?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddService = () => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para crear un anuncio');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    setEditingService(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditService = (service: Service) => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para editar un anuncio');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    setEditingService(service);
    setIsFormOpen(true);
  };
  
  const handleDeleteService = (service: Service) => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para eliminar un anuncio');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    deleteListingMutation.mutate(service);
  };
  
  const handleSubmitService = (serviceData: Partial<Service>) => {
    if (!isAuthenticated || !user) {
      toast.error('Debes iniciar sesión para crear anuncios');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    if (editingService) {
      updateListingMutation.mutate({
        ...serviceData,
        id: editingService.id
      });
    } else {
      createListingMutation.mutate(serviceData);
    }
    
    setIsFormOpen(false);
  };

  return (
    <PageContainer 
      title="Anuncios" 
      subtitle="Administra tus anuncios de servicios"
      action={
        <Button onClick={handleAddService}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Anuncio
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="max-w-md">
          <Input 
            placeholder="Buscar anuncios..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-lg animate-pulse bg-muted"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={handleEditService}
                onDelete={handleDeleteService}
              />
            ))}
            
            {filteredListings.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No se encontraron anuncios. Agrega un nuevo anuncio para comenzar.</p>
              </div>
            )}
          </div>
        )}
        
        <ServiceForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmitService}
          initialData={editingService}
          onDelete={handleDeleteService}
        />
      </div>
    </PageContainer>
  );
};

export default Services;
