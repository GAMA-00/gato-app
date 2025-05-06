
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, DollarSign, Calendar, Star, BadgeCheck, Users, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ProviderData } from '@/components/client/results/types';
import ProviderExperienceLevel from '@/components/client/results/ProviderExperienceLevel';
import ServiceGallery from '@/components/client/results/ServiceGallery';
import ServiceVariantsSelector from '@/components/client/results/ServiceVariantsSelector';
import BookingSummary from '@/components/client/results/BookingSummary';

// Define interfaces for our data structures
interface ServiceTypeData {
  name: string;
  category?: {
    name: string;
  };
}

interface ClientResidencia {
  name: string;
  address: string;
}

interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface ServiceDetailData {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration: number;
  is_active: boolean;
  provider: ProviderData;
  service_type: ServiceTypeData;
  clientResidencia?: ClientResidencia | null;
  recurringClients?: number;
  serviceVariants?: ServiceVariant[];
  galleryImages?: string[];
  servicesCompleted?: number;
}

const ClientServiceDetail = () => {
  const { providerId, serviceId } = useParams<{ providerId: string; serviceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state?.bookingData || {};
  const { user } = useAuth();
  
  const [selectedVariants, setSelectedVariants] = useState<ServiceVariant[]>([]);

  useEffect(() => {
    console.log("ClientServiceDetail rendered with params:", { providerId, serviceId });
    console.log("Booking data from state:", bookingData);
  }, [providerId, serviceId, bookingData]);
  
  // Fetch provider and service details
  const { data: serviceDetails, isLoading, error } = useQuery({
    queryKey: ['service-detail', serviceId, providerId],
    queryFn: async () => {
      if (!serviceId || !providerId) {
        console.error("Missing serviceId or providerId:", { serviceId, providerId });
        return null;
      }
      
      console.log("Fetching listing details for:", { serviceId, providerId });
      
      // Get listing details
      const { data: listing, error } = await supabase
        .from('listings')
        .select(`
          *,
          provider:provider_id(
            id, 
            name, 
            about_me,
            experience_years,
            average_rating,
            certification_files,
            email,
            phone
          ),
          service_type:service_type_id(
            name,
            category:category_id(
              name
            )
          )
        `)
        .eq('id', serviceId)
        .eq('provider_id', providerId)
        .single();
        
      if (error) {
        console.error("Error fetching service details:", error);
        toast.error("Error al obtener detalles del servicio");
        throw error;
      }
      
      console.log("Listing data:", listing);
      
      // Get client residence info
      let clientResidencia = null;
      if (user?.id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('residencia_id, residencias(name, address)')
          .eq('id', user.id)
          .maybeSingle();
          
        clientResidencia = clientData?.residencias;
      }
      
      // Process provider data to include hasCertifications
      const providerData = listing.provider as ProviderData || {};
      const hasCertifications = providerData.certification_files && 
                               Array.isArray(providerData.certification_files) && 
                               providerData.certification_files.length > 0;
      
      // Create service variants from the JSON data or use default
      let serviceVariants: ServiceVariant[] = [];
      if (listing.service_variants && Array.isArray(listing.service_variants) && listing.service_variants.length > 0) {
        serviceVariants = listing.service_variants.map((variant: any, index: number) => ({
          id: variant.id || `variant-${index}`,
          name: variant.name || `Opción ${index + 1}`,
          price: parseFloat(variant.price) || listing.base_price,
          duration: parseInt(variant.duration) || listing.duration
        }));
      } else {
        // Create default variant if none exist
        serviceVariants = [{
          id: 'default-variant',
          name: listing.title,
          price: listing.base_price,
          duration: listing.duration
        }];
      }
      
      // Mock data
      const recurringClients = Math.floor(Math.random() * 10);
      const servicesCompleted = Math.floor(Math.random() * 50) + 10;
      
      // Mock gallery images for demo (replace with actual gallery images)
      const galleryImages = [
        'https://placehold.co/800x600?text=Servicio+1',
        'https://placehold.co/800x600?text=Servicio+2',
        'https://placehold.co/800x600?text=Servicio+3'
      ];
      
      return {
        ...listing,
        provider: {
          ...providerData,
          hasCertifications,
          servicesCompleted
        },
        clientResidencia,
        recurringClients,
        serviceVariants,
        galleryImages,
        servicesCompleted
      } as ServiceDetailData;
    },
    enabled: !!serviceId && !!providerId,
    retry: 1
  });

  useEffect(() => {
    if (error) {
      console.error("Error in service details query:", error);
      toast.error("No se pudo cargar la información del servicio");
    }
  }, [error]);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleSchedule = () => {
    // Use selected variants or the default service if none selected
    const servicesToBook = selectedVariants.length > 0 ? selectedVariants : 
      (serviceDetails?.serviceVariants ? [serviceDetails.serviceVariants[0]] : []);
    
    toast.success("¡Servicio agendado con éxito!");
    navigate('/client/booking-summary', {
      state: {
        provider: serviceDetails?.provider,
        service: {
          id: serviceDetails?.id,
          name: serviceDetails?.title,
          price: selectedVariants.reduce((sum, v) => sum + v.price, 0) || serviceDetails?.base_price,
          duration: selectedVariants.reduce((sum, v) => sum + v.duration, 0) || serviceDetails?.duration
        },
        selectedVariants: servicesToBook,
        bookingData
      }
    });
  };
  
  if (isLoading) {
    return (
      <PageContainer
        title="Cargando detalles..."
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
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </PageContainer>
    );
  }
  
  if (!serviceDetails) {
    return (
      <PageContainer
        title="Servicio no encontrado"
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">No pudimos encontrar los detalles de este servicio.</p>
        </div>
      </PageContainer>
    );
  }
  
  // Safely access nested properties
  const provider = serviceDetails?.provider || {};
  const serviceType = serviceDetails?.service_type || { name: '', category: { name: '' } };
  const category = serviceType.category || { name: '' };
  const experienceYears = provider.experience_years || 0;
  const serviceVariants = serviceDetails.serviceVariants || [];
  
  return (
    <PageContainer
      title={serviceDetails.title}
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver a resultados</span>
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        {/* Left Column: Provider Info and Service Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Provider Info Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={undefined} alt={provider.name} />
                  <AvatarFallback>
                    {provider.name?.substring(0, 2).toUpperCase() || 'P'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="ml-4 space-y-2">
                  <h3 className="text-lg font-semibold">{provider.name}</h3>
                  
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="font-medium">{provider.average_rating?.toFixed(1) || "Nuevo"}</span>
                    <span className="text-muted-foreground text-sm ml-1">(9 reseñas)</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Experience Level Badge */}
                    <ProviderExperienceLevel experienceYears={experienceYears} />
                    
                    {/* Certifications Badge */}
                    {provider.hasCertifications && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3" />
                        Certificado
                      </Badge>
                    )}
                    
                    {/* Services Completed Badge */}
                    {provider.servicesCompleted && provider.servicesCompleted > 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {provider.servicesCompleted} servicios completados
                      </Badge>
                    )}
                    
                    {/* Recurring Clients Badge */}
                    {serviceDetails.recurringClients && serviceDetails.recurringClients > 0 && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {serviceDetails.recurringClients} clientes recurrentes
                      </Badge>
                    )}
                    
                    {/* Location Badge */}
                    {serviceDetails.clientResidencia && (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {serviceDetails.clientResidencia.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Gallery */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Galería de trabajos</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceGallery images={serviceDetails.galleryImages || []} />
            </CardContent>
          </Card>
          
          {/* Provider Bio */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sobre mí</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">{provider.about_me || 'Este profesional aún no ha añadido información sobre su perfil.'}</p>
            </CardContent>
          </Card>
          
          {/* Service Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Descripción del servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Badge>{category.name}</Badge>
                <Badge variant="outline">{serviceType.name}</Badge>
              </div>
              <p className="text-muted-foreground whitespace-pre-line">{serviceDetails.description}</p>
            </CardContent>
          </Card>
          
          {/* Service Variants/Options */}
          <ServiceVariantsSelector 
            variants={serviceVariants} 
            onSelectVariant={setSelectedVariants} 
          />
        </div>
        
        {/* Right Column: Booking Summary */}
        <div className="space-y-6">
          <BookingSummary
            selectedVariants={selectedVariants.length > 0 ? selectedVariants : (serviceDetails.serviceVariants ? [serviceDetails.serviceVariants[0]] : [])}
            onSchedule={handleSchedule}
          />
          
          {/* Price Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Información de precio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precio base</span>
                  <span>${serviceDetails.base_price.toFixed(2)}/servicio</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duración estándar</span>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>
                      {Math.floor(serviceDetails.duration / 60) > 0 ? `${Math.floor(serviceDetails.duration / 60)}h ` : ''}
                      {serviceDetails.duration % 60 > 0 ? `${serviceDetails.duration % 60}min` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientServiceDetail;
