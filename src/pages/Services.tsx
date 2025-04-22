
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/PageContainer';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceForm from '@/components/services/ServiceForm';
import { Service } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  const { user } = useAuth();
  
  // Load services from localStorage on component mount
  useEffect(() => {
    const savedServices = localStorage.getItem('gato_services');
    if (savedServices) {
      try {
        const parsedServices = JSON.parse(savedServices, (key, value) => {
          if (key === 'createdAt') {
            return new Date(value);
          }
          return value;
        });
        setServices(parsedServices);
      } catch (error) {
        console.error('Error parsing services:', error);
        setServices([]);
      }
    }
  }, []);
  
  // Save services to localStorage when they change
  useEffect(() => {
    if (services.length > 0) {
      localStorage.setItem('gato_services', JSON.stringify(services));
    }
  }, [services]);
  
  // Filter services to only show those created by the current provider
  const providerServices = user ? services.filter(service => service.providerId === user.id) : [];
  
  const filteredServices = providerServices.filter(
    service => service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddService = () => {
    setEditingService(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };
  
  const handleDeleteService = (service: Service) => {
    setServices(services.filter(s => s.id !== service.id));
    toast.success('Anuncio eliminado exitosamente');
  };
  
  const handleSubmitService = (serviceData: Partial<Service>) => {
    if (!user) {
      toast.error('Debes iniciar sesión para crear anuncios');
      return;
    }
    
    if (editingService) {
      setServices(services.map(s => 
        s.id === editingService.id ? { 
          ...s, 
          ...serviceData,
          buildingIds: serviceData.buildingIds || [],
          providerId: s.providerId
        } : s
      ));
      toast.success('Anuncio actualizado exitosamente');
    } else {
      const newService: Service = {
        id: Date.now().toString(),
        name: serviceData.name || '',
        category: serviceData.category || 'other',
        duration: serviceData.duration || 60,
        price: serviceData.price || 0,
        description: serviceData.description || '',
        buildingIds: serviceData.buildingIds || [],
        createdAt: new Date(),
        providerId: user.id,
        providerName: user.name
      };
      
      setServices([newService, ...services]);
      toast.success('Anuncio agregado exitosamente');
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEditService}
              onDelete={handleDeleteService}
            />
          ))}
          
          {filteredServices.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No se encontraron anuncios. Agrega un nuevo anuncio para comenzar.</p>
            </div>
          )}
        </div>
        
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
