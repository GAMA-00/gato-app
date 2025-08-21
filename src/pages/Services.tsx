import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/layout/Navbar';
import PageContainer from '@/components/layout/PageContainer';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceForm from '@/components/services/ServiceForm';
import { Service, ServiceVariant, WeeklyAvailability, CustomVariableGroup } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useServiceMutations } from '@/hooks/useServiceMutations';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createListingMutation, deleteListingMutation } = useServiceMutations();

  const { data: services, isLoading, error } = useQuery({
    queryKey: ['listings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          service_types!inner(
            id,
            name,
            service_categories!inner(
              id,
              name,
              label
            )
          )
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database result to Service interface with proper type casting
      const mappedServices: Service[] = (data || []).map(listing => ({
        id: listing.id,
        name: listing.title, // Map title to name
        subcategoryId: listing.service_type_id,
        category: listing.service_types.service_categories.name,
        duration: listing.standard_duration || listing.duration, // Use standard_duration as primary
        price: Number(listing.base_price), // Map base_price to price
        description: listing.description,
        createdAt: new Date(listing.created_at), // Map and convert to Date
        residenciaIds: [], // Will be populated separately if needed
        providerId: listing.provider_id,
        providerName: user?.name || '', // Use current user name
        galleryImages: Array.isArray(listing.gallery_images) ? listing.gallery_images as string[] : [],
        serviceVariants: Array.isArray(listing.service_variants) ? listing.service_variants as ServiceVariant[] : [],
        availability: (typeof listing.availability === 'object' && listing.availability !== null) ? listing.availability as WeeklyAvailability : {},
        isPostPayment: listing.is_post_payment,
        customVariableGroups: Array.isArray(listing.custom_variable_groups) ? listing.custom_variable_groups as CustomVariableGroup[] : [],
        useCustomVariables: listing.use_custom_variables || false,
        slotPreferences: (typeof listing.slot_preferences === 'object' && listing.slot_preferences !== null) ? listing.slot_preferences as Record<string, boolean> : {},
      }));
      
      return mappedServices;
    },
    enabled: !!user?.id,
  });

  const handleEdit = (serviceId: string) => {
    navigate(`/services/edit/${serviceId}`);
  };

  const handleDelete = (service: Service) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este anuncio?')) {
      deleteListingMutation.mutate(service.id, {
        onSuccess: () => {
          toast.success('Anuncio eliminado exitosamente');
        },
        onError: (error) => {
          console.error('Error deleting service:', error);
          toast.error('Error al eliminar el anuncio');
        },
      });
    }
  };

  const handleCreateService = (data: Partial<Service>) => {
    setIsSubmitting(true);
    createListingMutation.mutate(
      { ...data, providerId: user?.id, providerName: user?.name },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          toast.success('Anuncio creado exitosamente');
          setIsSubmitting(false);
        },
        onError: (error) => {
          console.error('Error creating service:', error);
          toast.error('Error al crear el anuncio');
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  return (
    <>
      <Navbar />
      <PageContainer title="Mis Anuncios">
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Anuncio
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Error al cargar los anuncios.</p>
          </div>
        ) : services && services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={() => handleEdit(service.id)}
                onDelete={() => handleDelete(service)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No tienes anuncios creados.</p>
          </div>
        )}

        <ServiceForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleCreateService}
          isSubmitting={isSubmitting}
        />
      </PageContainer>
    </>
  );
};

export default Services;
