
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
import { ServiceCategoryGroup, ProviderProfile } from '@/lib/types';
import { ProviderData } from '@/components/client/results/types';

interface ServiceOption {
  id: string;
  size: string;
  price: number;
  duration: number;
}

interface ProviderService {
  id: string;
  name: string;
  options: ServiceOption[];
}

// Interface for service type data from supabase
interface ServiceTypeData {
  name?: string;
  category?: {
    name?: string;
    label?: string;
  };
}

const ProviderProfilePage = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData } = location.state || {};
  
  // Fetch provider data con manejo seguro de users y estructura de datos
  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      
      const { data, error } = await supabase
        .from('providers')
        .select(`
          *,
          users(
            name,
            avatar_url,
            created_at
          )
        `)
        .eq('id', providerId)
        .maybeSingle();
        
      if (error) throw error;
      
      if (!data) {
        toast.error('No se encontró el proveedor');
        return null;
      }
      
      // Safe access to potentially undefined values with proper type assertions
      const userData = data.users || {};
      let userName = '';
      let userAvatar = null;
      let createdAt = new Date();
      
      if (Array.isArray(userData) && userData.length > 0) {
        const user = userData[0] as { name?: string; avatar_url?: string; created_at?: string };
        userName = user?.name || '';
        userAvatar = user?.avatar_url || null;
        createdAt = new Date(user?.created_at || data.created_at || new Date());
      } else if (typeof userData === 'object') {
        const user = userData as { name?: string; avatar_url?: string; created_at?: string };
        userName = user?.name || '';
        userAvatar = user?.avatar_url || null;
        createdAt = new Date(user?.created_at || data.created_at || new Date());
      }
      
      // Parse certification files if available
      let certificationFiles = [];
      try {
        if (data.certification_files) {
          certificationFiles = JSON.parse(JSON.stringify(data.certification_files));
        }
      } catch (e) {
        console.error("Error parsing certification files:", e);
      }
      
      // Format provider data for the UI
      return {
        id: data.id || '',
        name: data.name || userName || 'Proveedor',
        avatar: userAvatar,
        rating: data.average_rating || 0,
        ratingCount: 0, 
        aboutMe: data.about_me || 'No hay información disponible',
        galleryImages: [], 
        experienceYears: data.experience_years || 0,
        hasCertifications: certificationFiles.length > 0, 
        certificationFiles: certificationFiles,
        handlesDangerousDogs: false, 
        servicesCompleted: 0, 
        isVerified: true, 
        joinDate: createdAt,
        detailedRatings: {
          service: 0,
          valueForMoney: 0,
          friendliness: 0,
          materials: 0,
          professionalism: 0,
          punctuality: 0
        },
        reviews: [] 
      } as ProviderProfile;
    },
    enabled: !!providerId
  });
  
  // Fetch provider's services
  const { data: serviceCategories = [], isLoading: loadingServices } = useQuery({
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
      const servicesByCategory: Record<string, ServiceCategoryGroup> = {};
      
      data.forEach(listing => {
        const serviceType = listing.service_type as ServiceTypeData || {};
        const category = serviceType?.category || {};
        // Safe access with fallbacks
        const categoryName = category?.name || 'other';
        const categoryLabel = category?.label || 'Otros';
        
        if (!servicesByCategory[categoryName]) {
          servicesByCategory[categoryName] = {
            id: categoryName,
            name: categoryLabel,
            services: []
          };
        }
        
        // Create options for different pet sizes
        const basePrice = listing.base_price || 0;
        const baseDuration = listing.duration || 60;
        
        const options = [
          {
            id: `${listing.id}-small`,
            size: 'Perro pequeño',
            price: basePrice,
            duration: baseDuration
          },
          {
            id: `${listing.id}-medium`,
            size: 'Perro mediano',
            price: Math.round(basePrice * 1.15),
            duration: Math.round(baseDuration * 1.2)
          },
          {
            id: `${listing.id}-large`,
            size: 'Perro grande',
            price: Math.round(basePrice * 1.5),
            duration: Math.round(baseDuration * 1.5)
          },
          {
            id: `${listing.id}-giant`,
            size: 'Perro gigante',
            price: Math.round(basePrice * 2),
            duration: Math.round(baseDuration * 1.8)
          }
        ];
        
        const service: ProviderService = {
          id: listing.id,
          name: listing.title,
          options: options
        };
        
        servicesByCategory[categoryName].services.push(service);
      });
      
      return Object.values(servicesByCategory) as ServiceCategoryGroup[];
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
    
    for (const category of serviceCategories) {
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
          providerName: provider?.name,
          petSize: selectedOption.size
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
              categories={serviceCategories}
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

export default ProviderProfilePage;
