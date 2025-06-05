
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, Users, Award, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ServiceGallery from '@/components/client/results/ServiceGallery';
import ServiceVariantsSelector from '@/components/client/results/ServiceVariantsSelector';
import BookingSummary from '@/components/client/results/BookingSummary';
import { ServiceVariant } from '@/components/client/service/types';
import { useServiceDetail } from '@/components/client/service/useServiceDetail';
import ProviderBio from '@/components/client/service/ProviderBio';
import ServiceDescription from '@/components/client/service/ServiceDescription';
import ProviderCertifications from '@/components/client/service/ProviderCertifications';

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
  
  // Use the custom hook to fetch service details
  const { serviceDetails, isLoading } = useServiceDetail(providerId, serviceId, user?.id);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleSchedule = () => {
    if (!user || !user.id) {
      toast.warning("Debes iniciar sesión para agendar un servicio");
      navigate('/login', { 
        state: { 
          redirectTo: `/client/service/${providerId}/${serviceId}`,
          bookingData
        } 
      });
      return;
    }

    if (!serviceDetails) {
      toast.error("Error: No se encontraron detalles del servicio");
      return;
    }
    
    // Use selected variants or the default service if none selected
    const servicesToBook = selectedVariants.length > 0 ? selectedVariants : 
      (serviceDetails?.serviceVariants ? [serviceDetails.serviceVariants[0]] : []);
    
    // Calculate total price and duration from selected variants
    const totalPrice = servicesToBook.reduce((sum, v) => sum + Number(v.price), 0);
    const totalDuration = servicesToBook.reduce((sum, v) => sum + Number(v.duration), 0);
    
    // Ensure we have valid price and duration
    if (isNaN(totalPrice) || isNaN(totalDuration)) {
      toast.error("Error al calcular el precio o duración del servicio");
      return;
    }

    // Navigate to booking page with service data
    console.log("Navigating to booking with data:", {
      providerId: serviceDetails.provider?.id,
      listingId: serviceDetails.id,
      serviceName: serviceDetails.title,
      providerName: serviceDetails.provider?.name,
      price: totalPrice,
      duration: totalDuration
    });
    
    navigate('/client/booking', {
      state: {
        providerId: serviceDetails.provider?.id,
        listingId: serviceDetails.id,
        serviceName: serviceDetails.title,
        providerName: serviceDetails.provider?.name,
        price: totalPrice,
        duration: totalDuration,
        notes: bookingData.notes || '',
        recurrence: bookingData.recurrence || 'none'
      }
    });
  };
  
  if (isLoading) {
    return (
      <PageContainer
        title="Cargando perfil..."
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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Provider Header Skeleton */}
          <div className="bg-white rounded-lg p-8 text-center">
            <Skeleton className="h-32 w-32 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-6 w-32 mx-auto mb-4" />
            <div className="flex justify-center gap-2 mb-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }
  
  if (!serviceDetails) {
    return (
      <PageContainer
        title="Perfil no encontrado"
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
          <p className="text-muted-foreground">No pudimos encontrar el perfil de este proveedor.</p>
        </div>
      </PageContainer>
    );
  }

  // Calculate default selection and price
  const defaultVariant = serviceDetails.serviceVariants?.[0];
  const defaultPrice = defaultVariant?.price || serviceDetails.base_price || 0;
  const defaultDuration = defaultVariant?.duration || serviceDetails.duration || 0;
  
  // Ensure we have variants for display and selection
  const variants = serviceDetails.serviceVariants || [{
    id: 'default',
    name: serviceDetails.title || 'Servicio básico',
    price: defaultPrice,
    duration: defaultDuration
  }];

  const experienceYears = serviceDetails.provider?.experience_years || 0;
  
  // Calculate experience level from 1 to 5 based on years
  const getExperienceLevel = (years: number) => {
    if (years < 1) return 1;
    if (years < 2) return 2;
    if (years < 4) return 3;
    if (years < 7) return 4;
    return 5;
  };

  const experienceLevel = getExperienceLevel(experienceYears);
  
  // Use actual rating or default to 5.0 for new providers
  const displayRating = serviceDetails.provider?.average_rating && serviceDetails.provider.average_rating > 0 
    ? serviceDetails.provider.average_rating 
    : 5.0;
  
  return (
    <PageContainer
      title=""
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
      <div className="max-w-4xl mx-auto animate-fade-in pb-24 md:pb-0">
        {/* Provider Header - Large Profile Section */}
        <div className="bg-white rounded-lg p-8 mb-6 text-center">
          <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-app-border">
            <AvatarImage src={serviceDetails.provider?.avatar_url} alt={serviceDetails.provider?.name} />
            <AvatarFallback className="bg-app-cardAlt text-app-text text-2xl">
              {serviceDetails.provider?.name?.substring(0, 2).toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-3xl font-bold text-app-text mb-2">{serviceDetails.provider?.name || 'Proveedor'}</h1>
          
          {/* Metrics Row */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {/* Calificación Promedio */}
            <div className="flex items-center bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
              <Star className="h-5 w-5 fill-amber-600 text-amber-600 mr-2" />
              <span className="font-medium text-amber-700 text-lg">
                {displayRating.toFixed(1)}
              </span>
            </div>
            
            {/* Clientes Recurrentes */}
            <div className="flex items-center bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
              <Users className="h-5 w-5 text-amber-600 mr-2" />
              <span className="font-medium text-amber-700 text-lg">{serviceDetails.recurringClients || 0}</span>
              <span className="text-amber-600 text-sm ml-1">recurrentes</span>
            </div>
            
            {/* Nivel de Experiencia */}
            <div className="flex items-center bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
              <Award className="h-5 w-5 text-amber-600 mr-2" />
              <span className="font-medium text-amber-700 text-lg">Nivel {experienceLevel}</span>
            </div>
            
            {/* Location Badge */}
            {serviceDetails.clientResidencia && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-100 flex items-center gap-1 px-4 py-2">
                <MapPin className="h-4 w-4" />
                {serviceDetails.clientResidencia.name}
              </Badge>
            )}
          </div>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Especialista en {serviceDetails.service_type?.name || serviceDetails.title}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Service Details and Gallery */}
          <div className="md:col-span-2 space-y-6">
            {/* Service Description */}
            <ServiceDescription 
              description={serviceDetails.description} 
              serviceType={serviceDetails.service_type} 
            />
            
            {/* Gallery - Showing all images */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Galería de trabajos</CardTitle>
              </CardHeader>
              <CardContent>
                <ServiceGallery 
                  images={serviceDetails.galleryImages || []} 
                  showExpandButton={true}
                  maxPreview={6}
                />
              </CardContent>
            </Card>
            
            {/* Provider Bio */}
            <ProviderBio aboutMe={serviceDetails.provider.about_me} />
            
            {/* PDF Certifications */}
            {serviceDetails.provider.certificationFiles && (
              <ProviderCertifications 
                certifications={serviceDetails.provider.certificationFiles}
              />
            )}
            
            {/* Service Variants/Options */}
            <ServiceVariantsSelector 
              variants={variants} 
              onSelectVariant={setSelectedVariants} 
            />
          </div>
          
          {/* Right Column: Booking Summary */}
          <div className="space-y-6">
            <BookingSummary
              selectedVariants={selectedVariants.length > 0 ? selectedVariants : [variants[0]]}
              onSchedule={handleSchedule}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientServiceDetail;
