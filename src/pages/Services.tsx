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
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Services = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          subcategories(*)
        `)
        .eq('provider_id', user?.id || '');
        
      if (error) {
        toast.error('Error cargando servicios: ' + error.message);
        throw error;
      }
      
      return data.map(service => ({
        ...service,
        id: service.id,
        name: service.name,
        subcategoryId: service.subcategory_id,
        category: service.subcategories?.category_id,
        duration: service.duration,
        price: service.base_price,
        description: service.description,
        residenciaIds: [], // Manejaremos esto por separado
        createdAt: new Date(service.created_at),
        providerId: service.provider_id,
        providerName: user?.name || ''
      })) as Service[];
    },
    enabled: !!isAuthenticated && !!user?.id
  });
  
  const { data: residenciaAssociations = [] } = useQuery({
    queryKey: ['residencia_services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('residencia_services')
        .select('*');
        
      if (error) {
        toast.error('Error cargando asociaciones de residencias: ' + error.message);
        throw error;
      }
      
      return data;
    },
    enabled: !!services.length
  });
  
  const processedServices = React.useMemo(() => {
    return services.map(service => ({
      ...service,
      residenciaIds: residenciaAssociations
        .filter(assoc => assoc.service_id === service.id)
        .map(assoc => assoc.residencia_id)
    }));
  }, [services, residenciaAssociations]);
  
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      const { data: subcategory, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('category_id')
        .eq('id', serviceData.subcategoryId)
        .single();
        
      if (subcategoryError) throw subcategoryError;
      
      const { data, error } = await supabase
        .from('services')
        .insert({
          name: serviceData.name || '',
          subcategory_id: serviceData.subcategoryId,
          description: serviceData.description || '',
          base_price: serviceData.price || 0,
          duration: serviceData.duration || 60,
          provider_id: user?.id || '',
          category: subcategory.category_id
        })
        .select('id')
        .single();
        
      if (error) throw error;
      
      if (serviceData.residenciaIds?.length) {
        const residenciaAssociations = serviceData.residenciaIds.map(residenciaId => ({
          service_id: data.id,
          residencia_id: residenciaId
        }));
        
        const { error: residenciaError } = await supabase
          .from('residencia_services')
          .insert(residenciaAssociations);
          
        if (residenciaError) throw residenciaError;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['residencia_services'] });
      toast.success('Anuncio agregado exitosamente');
    },
    onError: (error) => {
      toast.error('Error creando servicio: ' + error.message);
    }
  });
  
  const updateServiceMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      if (!serviceData.id) throw new Error('Service ID is required');
      
      const { error } = await supabase
        .from('services')
        .update({
          name: serviceData.name,
          subcategory_id: serviceData.subcategoryId,
          description: serviceData.description,
          base_price: serviceData.price,
          duration: serviceData.duration
        })
        .eq('id', serviceData.id);
        
      if (error) throw error;
      
      const { error: deleteError } = await supabase
        .from('residencia_services')
        .delete()
        .eq('service_id', serviceData.id);
        
      if (deleteError) throw deleteError;
      
      if (serviceData.residenciaIds?.length) {
        const residenciaAssociations = serviceData.residenciaIds.map(residenciaId => ({
          service_id: serviceData.id!,
          residencia_id: residenciaId
        }));
        
        const { error: residenciaError } = await supabase
          .from('residencia_services')
          .insert(residenciaAssociations);
          
        if (residenciaError) throw residenciaError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['residencia_services'] });
      toast.success('Anuncio actualizado exitosamente');
    },
    onError: (error) => {
      toast.error('Error actualizando servicio: ' + error.message);
    }
  });
  
  const deleteServiceMutation = useMutation({
    mutationFn: async (service: Service) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['residencia_services'] });
      toast.success('Anuncio eliminado exitosamente');
    },
    onError: (error) => {
      toast.error('Error eliminando servicio: ' + error.message);
    }
  });
  
  const filteredServices = processedServices.filter(
    service => 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.subcategoryId.toLowerCase().includes(searchTerm.toLowerCase())
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
    
    deleteServiceMutation.mutate(service);
  };
  
  const handleSubmitService = (serviceData: Partial<Service>) => {
    if (!isAuthenticated || !user) {
      toast.error('Debes iniciar sesión para crear anuncios');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    if (editingService) {
      updateServiceMutation.mutate({
        ...serviceData,
        id: editingService.id
      });
    } else {
      createServiceMutation.mutate(serviceData);
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
