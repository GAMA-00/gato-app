
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageContainer from '@/components/layout/PageContainer';
import ProviderHeader from '@/components/providers/ProviderHeader';
import ProviderAbout from '@/components/providers/ProviderAbout';
import ProviderGallery from '@/components/providers/ProviderGallery';
import ProviderServices from '@/components/providers/ProviderServices';
import ProviderInfo from '@/components/providers/ProviderInfo';
import ProviderAchievements from '@/components/providers/ProviderAchievements';
import ProviderReviews from '@/components/providers/ProviderReviews';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const ProviderProfile = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData } = location.state || {};
  
  // Fetch provider data
  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      
      const { data, error } = await supabase
        .from('providers')
        .select('*, users!inner(*)')
        .eq('id', providerId)
        .single();
        
      if (error) throw error;
      
      // Format provider data for the UI
      return {
        id: data.id,
        name: data.name || data.users.name || 'Proveedor',
        avatar: data.users.avatar_url,
        rating: data.average_rating || 0,
        ratingCount: 0, // This would come from a count of reviews
        aboutMe: data.about_me || 'No hay información disponible',
        galleryImages: [], // This would come from a gallery table
        experienceYears: data.experience_years || 0,
        hasCertifications: false, // This would come from a certifications table
        handlesDangerousDogs: false, // This would need to be added to the providers table
        servicesCompleted: 0, // This would come from completed appointments count
        isVerified: true, // This would be a verification status
        joinDate: new Date(data.created_at),
        detailedRatings: {
          service: 0,
          valueForMoney: 0,
          friendliness: 0,
          materials: 0,
          professionalism: 0,
          punctuality: 0
        },
        reviews: [] // This would come from a reviews table
      };
    },
    enabled: !!providerId
  });
  
  // Fetch provider's services
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['provider-services', providerId],
    queryFn: async () => {
      if (!providerId) return [];
      
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          service_type:service_type_id(
            name,
            category:category_id(name, label)
          )
        `)
        .eq('provider_id', providerId);
        
      if (error) throw error;
      
      // Group services by category
      const servicesByCategory: any = {};
      
      data.forEach(listing => {
        const categoryName = listing.service_type?.category?.name || 'other';
        const categoryLabel = listing.service_type?.category?.label || 'Otros';
        
        if (!servicesByCategory[categoryName]) {
          servicesByCategory[categoryName] = {
            id: categoryName,
            name: categoryLabel,
            services: []
          };
        }
        
        servicesByCategory[categoryName].services.push({
          id: listing.id,
          name: listing.title,
          options: [{
            id: `${listing.id}-default`,
            size: 'Estándar',
            price: listing.base_price,
            duration: listing.duration
          }]
        });
      });
      
      return Object.values(servicesByCategory);
    },
    enabled: !!providerId
  });
  
  const handleServiceSelection = (serviceId: string, optionId: string) => {
    if (!bookingData) {
      toast.error("No se encontró información de reserva");
      return;
    }
    
    // Find the selected service and option
    let selectedService = null;
    let selectedOption = null;
    
    for (const category of services) {
      for (const service of category.services) {
        if (service.id === serviceId) {
          selectedService = service;
          selectedOption = service.options.find(opt => opt.id === optionId);
          break;
        }
      }
      if (selectedService) break;
    }
    
    if (!selectedService || !selectedOption) {
      toast.error("Servicio no encontrado");
      return;
    }
    
    // Navigate to summary page with all data
    navigate(`/client/booking-summary`, {
      state: {
        bookingData: {
          ...bookingData,
          serviceId,
          serviceName: selectedService.name,
          price: selectedOption.price,
          duration: selectedOption.duration,
          providerId,
          providerName: provider?.name
        }
      }
    });
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  if (isLoading || !provider) {
    return (
      <PageContainer
        title={<Skeleton className="h-10 w-40" />}
        subtitle={
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Volver</span>
          </Button>
        }
      >
        <div className="space-y-8 animate-pulse">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={provider.name}
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver</span>
        </Button>
      }
    >
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Cabecera del proveedor */}
        <ProviderHeader 
          provider={provider} 
          bookingMode={!!bookingData}
        />
        
        {/* Pestañas para la información del proveedor */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="services">Servicios</TabsTrigger>
            <TabsTrigger value="about">Sobre mí</TabsTrigger>
            <TabsTrigger value="gallery">Galería</TabsTrigger>
            <TabsTrigger value="reviews">Valoraciones</TabsTrigger>
          </TabsList>
          
          <TabsContent value="services" className="space-y-6">
            <ProviderServices 
              categories={services}
              isLoading={loadingServices} 
              onServiceSelect={handleServiceSelection}
              bookingMode={!!bookingData}
            />
            <ProviderInfo provider={provider} />
            <ProviderAchievements provider={provider} />
          </TabsContent>
          
          <TabsContent value="about" className="space-y-6">
            <ProviderAbout provider={provider} />
            <ProviderInfo provider={provider} />
            <ProviderAchievements provider={provider} />
          </TabsContent>
          
          <TabsContent value="gallery" className="space-y-6">
            <ProviderGallery provider={provider} />
          </TabsContent>
          
          <TabsContent value="reviews" className="space-y-6">
            <ProviderReviews provider={provider} />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
};

export default ProviderProfile;
