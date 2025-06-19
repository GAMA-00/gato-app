import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceDetail } from '@/components/client/service/useServiceDetail';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar } from 'lucide-react';
import ProviderHeader from '@/components/providers/ProviderHeader';
import ProviderInfo from '@/components/providers/ProviderInfo';
import ProviderAbout from '@/components/providers/ProviderAbout';
import ProviderGallery from '@/components/providers/ProviderGallery';
import ProviderAchievements from '@/components/providers/ProviderAchievements';
import ServiceDescription from '@/components/client/service/ServiceDescription';
import PriceInformation from '@/components/client/service/PriceInformation';
import ServiceVariantsSelector from '@/components/client/results/ServiceVariantsSelector';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const ClientProviderServiceDetail = () => {
  const { providerId, serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedVariants, setSelectedVariants] = React.useState<any[]>([]);

  const { serviceDetails, isLoading, error } = useServiceDetail(providerId, serviceId, user?.id);

  const handleBookService = () => {
    if (!serviceDetails || selectedVariants.length === 0) {
      toast.error('Por favor selecciona una opción de servicio');
      return;
    }

    // Navigate to booking page with the selected variants
    navigate(`/client/booking/${serviceId}`, {
      state: {
        providerId,
        serviceDetails,
        selectedVariants
      }
    });
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Cargando..." subtitle="">
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  if (error || !serviceDetails) {
    return (
      <>
        <Navbar />
        <PageContainer title="Error" subtitle="">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No se pudo cargar la información del servicio
            </p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        </PageContainer>
      </>
    );
  }

  // Transform provider data to match ProviderProfile interface
  const transformedProvider = {
    id: serviceDetails.provider.id,
    name: serviceDetails.provider.name || '',
    avatar: serviceDetails.provider.avatar_url,
    rating: serviceDetails.provider.average_rating || 5.0,
    ratingCount: 0,
    aboutMe: serviceDetails.provider.about_me || '',
    galleryImages: serviceDetails.galleryImages || [],
    experienceYears: serviceDetails.provider.experience_years || 0,
    hasCertifications: serviceDetails.provider.hasCertifications || false,
    certificationFiles: serviceDetails.provider.certificationFiles || [],
    handlesDangerousDogs: false,
    servicesCompleted: serviceDetails.provider.servicesCompleted || 0,
    isVerified: false,
    joinDate: new Date(serviceDetails.provider.created_at || Date.now()),
    detailedRatings: {
      service: 0,
      valueForMoney: 0,
      friendliness: 0,
      materials: 0,
      professionalism: 0,
      punctuality: 0,
    },
    reviews: []
  };

  // Transform service type data for ServiceDescription component
  const serviceTypeData = {
    id: serviceDetails.service_type?.id,
    name: serviceDetails.service_type?.name || serviceDetails.title,
    category: {
      id: serviceDetails.service_type?.category?.id,
      name: serviceDetails.service_type?.category?.name || serviceDetails.service_type?.category?.label || 'Servicio',
      label: serviceDetails.service_type?.category?.label || serviceDetails.service_type?.category?.name || 'Servicio'
    }
  };

  return (
    <>
      <Navbar />
      <PageContainer title="Detalles del Servicio" subtitle="">
        <div className="space-y-8">
          {/* Back button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>

          {/* Provider Header with booking mode */}
          <ProviderHeader provider={transformedProvider} bookingMode={true} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Service Details */}
              <div id="provider-services" className="space-y-6">
                <h3 className="text-2xl font-semibold text-luxury-navy">
                  {serviceDetails.title}
                </h3>
                
                <ServiceDescription 
                  description={serviceDetails.description}
                  serviceType={serviceTypeData}
                />

                {/* Service Variants Selector */}
                {serviceDetails.serviceVariants && serviceDetails.serviceVariants.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">Opciones de servicio</h4>
                    <ServiceVariantsSelector
                      variants={serviceDetails.serviceVariants}
                      onSelectVariant={setSelectedVariants}
                    />
                  </div>
                )}

                {/* Price Information */}
                {selectedVariants.length > 0 && (
                  <PriceInformation
                    basePrice={selectedVariants[0].price}
                    duration={selectedVariants[0].duration}
                  />
                )}

                {/* Booking Button */}
                <div className="flex justify-center pt-6">
                  <Button 
                    onClick={handleBookService}
                    size="lg"
                    className="w-full md:w-auto bg-luxury-navy hover:bg-luxury-navy/90"
                    disabled={selectedVariants.length === 0}
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Agendar Cita
                  </Button>
                </div>
              </div>

              {/* Provider About Section */}
              <ProviderAbout provider={transformedProvider} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <ProviderInfo provider={transformedProvider} />
              <ProviderAchievements 
                provider={transformedProvider} 
                recurringClientsCount={serviceDetails.recurringClients || 0}
              />
              <ProviderGallery provider={transformedProvider} />
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ClientProviderServiceDetail;
