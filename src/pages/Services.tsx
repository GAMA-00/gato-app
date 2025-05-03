
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
  
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          service_type:service_type_id(
            name,
            category:category_id(name)
          )
        `)
        .eq('provider_id', user.id);
        
      if (error) {
        toast.error('Error loading listings: ' + error.message);
        throw error;
      }
      
      return data.map(listing => ({
        id: listing.id,
        name: listing.title,
        subcategoryId: listing.service_type_id,
        category: listing.service_type?.category?.name,
        duration: listing.duration,
        price: listing.base_price,
        description: listing.description,
        residenciaIds: [], // We'll populate this separately
        createdAt: new Date(listing.created_at),
        providerId: listing.provider_id,
        providerName: user.name || ''
      })) as Service[];
    },
    enabled: !!isAuthenticated && !!user?.id
  });
  
  const { data: residenciaAssociations = [] } = useQuery({
    queryKey: ['listing_residencias'],
    queryFn: async () => {
      if (!listings.length) return [];
      
      const { data, error } = await supabase
        .from('listing_residencias')
        .select('*')
        .in('listing_id', listings.map(listing => listing.id));
        
      if (error) {
        toast.error('Error loading residencia associations: ' + error.message);
        throw error;
      }
      
      return data;
    },
    enabled: listings.length > 0
  });
  
  const processedListings = React.useMemo(() => {
    return listings.map(listing => ({
      ...listing,
      residenciaIds: residenciaAssociations
        .filter(assoc => assoc.listing_id === listing.id)
        .map(assoc => assoc.residencia_id)
    }));
  }, [listings, residenciaAssociations]);
  
  const createListingMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      if (!user?.id) throw new Error('User ID is required');
      
      // First, check if the provider record exists
      const { data: providerExists, error: providerCheckError } = await supabase
        .from('providers')
        .select('id')
        .eq('id', user.id)
        .single();
      
      // If provider check fails for any reason other than "not found", throw error
      if (providerCheckError && !providerCheckError.message.includes('No rows found')) {
        throw providerCheckError;
      }
      
      // If provider doesn't exist, create it
      if (!providerExists) {
        const { error: createProviderError } = await supabase
          .from('providers')
          .insert({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            about_me: '',
            experience_years: 0,
            average_rating: null
          });
          
        if (createProviderError) {
          toast.error('Error creating provider profile: ' + createProviderError.message);
          throw createProviderError;
        }
      }
      
      // Now create the listing
      const { data, error } = await supabase
        .from('listings')
        .insert({
          title: serviceData.name || '',
          service_type_id: serviceData.subcategoryId || '',
          description: serviceData.description || '',
          base_price: serviceData.price || 0,
          duration: serviceData.duration || 60,
          provider_id: user.id
        })
        .select('id')
        .single();
        
      if (error) throw error;
      
      // Associate with residencias if provided
      if (serviceData.residenciaIds?.length) {
        const residenciaAssociations = serviceData.residenciaIds.map(residenciaId => ({
          listing_id: data.id,
          residencia_id: residenciaId
        }));
        
        const { error: residenciaError } = await supabase
          .from('listing_residencias')
          .insert(residenciaAssociations);
          
        if (residenciaError) throw residenciaError;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      toast.success('Listing added successfully');
    },
    onError: (error) => {
      toast.error('Error creating listing: ' + error.message);
    }
  });
  
  const updateListingMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      if (!serviceData.id) throw new Error('Listing ID is required');
      
      // Update the listing
      const { error } = await supabase
        .from('listings')
        .update({
          title: serviceData.name,
          service_type_id: serviceData.subcategoryId,
          description: serviceData.description,
          base_price: serviceData.price,
          duration: serviceData.duration
        })
        .eq('id', serviceData.id);
        
      if (error) throw error;
      
      // Update residencia associations
      // First, delete existing associations
      const { error: deleteError } = await supabase
        .from('listing_residencias')
        .delete()
        .eq('listing_id', serviceData.id);
        
      if (deleteError) throw deleteError;
      
      // Then create new ones
      if (serviceData.residenciaIds?.length) {
        const residenciaAssociations = serviceData.residenciaIds.map(residenciaId => ({
          listing_id: serviceData.id!,
          residencia_id: residenciaId
        }));
        
        const { error: residenciaError } = await supabase
          .from('listing_residencias')
          .insert(residenciaAssociations);
          
        if (residenciaError) throw residenciaError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      toast.success('Listing updated successfully');
    },
    onError: (error) => {
      toast.error('Error updating listing: ' + error.message);
    }
  });
  
  const deleteListingMutation = useMutation({
    mutationFn: async (service: Service) => {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', service.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      toast.success('Listing deleted successfully');
    },
    onError: (error) => {
      toast.error('Error deleting listing: ' + error.message);
    }
  });
  
  const filteredListings = processedListings.filter(
    service => 
      service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.subcategoryId?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddService = () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to create a listing');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    setEditingService(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditService = (service: Service) => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to edit a listing');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    setEditingService(service);
    setIsFormOpen(true);
  };
  
  const handleDeleteService = (service: Service) => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to delete a listing');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    deleteListingMutation.mutate(service);
  };
  
  const handleSubmitService = (serviceData: Partial<Service>) => {
    if (!isAuthenticated || !user) {
      toast.error('You must be logged in to create listings');
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
