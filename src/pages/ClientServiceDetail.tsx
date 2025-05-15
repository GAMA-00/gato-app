
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ServiceGallery from '@/components/client/results/ServiceGallery';
import ServiceVariantsSelector from '@/components/client/results/ServiceVariantsSelector';
import BookingSummary from '@/components/client/results/BookingSummary';
import { ServiceVariant } from '@/components/client/service/types';
import { useServiceDetail } from '@/components/client/service/useServiceDetail';
import ProviderInfoCard from '@/components/client/service/ProviderInfoCard';
import ProviderBio from '@/components/client/service/ProviderBio';
import ServiceDescription from '@/components/client/service/ServiceDescription';
import PriceInformation from '@/components/client/service/PriceInformation';
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
    
    toast.success("¡Preparando servicio para reserva!");
    navigate('/client/booking-summary', {
      state: {
        bookingData: {
          serviceId: serviceDetails?.id,
          serviceName: serviceDetails?.title,
          providerId: serviceDetails?.provider?.id,
          providerName: serviceDetails?.provider?.name,
          price: totalPrice,
          duration: totalDuration,
          startTime: null,
          notes: bookingData.notes || '',
          frequency: bookingData.frequency || 'once',
          requiresScheduling: true
        }
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
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in pb-24 md:pb-0">
        {/* Left Column: Provider Info and Service Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Provider Info Card */}
          <ProviderInfoCard 
            provider={serviceDetails.provider} 
            recurringClients={serviceDetails.recurringClients} 
            clientResidencia={serviceDetails.clientResidencia} 
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
          
          {/* PDF Certifications */}
          {serviceDetails.provider.certificationFiles && (
            <ProviderCertifications 
              certifications={serviceDetails.provider.certificationFiles}
            />
          )}
          
          {/* Provider Bio */}
          <ProviderBio aboutMe={serviceDetails.provider.about_me} />
          
          {/* Service Description */}
          <ServiceDescription 
            description={serviceDetails.description} 
            serviceType={serviceDetails.service_type} 
          />
          
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
          
          {/* Price Information */}
          <PriceInformation 
            basePrice={serviceDetails.base_price} 
            duration={serviceDetails.duration} 
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientServiceDetail;
