import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceDetail } from '@/components/client/service/useServiceDetail';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getProviderLevelByJobs } from '@/lib/achievementTypes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProviderMerits } from '@/hooks/useProviderMerits';
import ServiceDetailTabs from '@/components/client/service/ServiceDetailTabs';
import { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import ServiceHeroSection from '@/components/client/service/ServiceHeroSection';
import ServiceMetricsGrid from '@/components/client/service/ServiceMetricsGrid';


const ClientProviderServiceDetail = () => {
  const { providerId, serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedVariants, setSelectedVariants] = React.useState<ServiceVariantWithQuantity[]>([]);

  const { serviceDetails, isLoading, error } = useServiceDetail(providerId, serviceId, user?.id);

  console.log('ClientProviderServiceDetail - Service details:', {
    provider: serviceDetails?.provider ? {
      id: serviceDetails.provider.id,
      name: serviceDetails.provider.name,
      avatar_url: serviceDetails.provider.avatar_url
    } : null
  });

  // Fetch provider merits for real-time rating updates
  const { data: providerMerits } = useProviderMerits(providerId);

  // Fetch completed jobs count to determine real achievement level
  const { data: completedJobsCount = 0 } = useQuery({
    queryKey: ['completed-jobs', providerId],
    queryFn: async () => {
      if (!providerId) return 0;
      
      const { data, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('provider_id', providerId)
        .in('status', ['confirmed', 'completed']);
        
      if (error) {
        console.error('Error fetching completed jobs count:', error);
        return 0;
      }
      
      return data?.length || 0;
    },
    enabled: !!providerId
  });

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

  const handleBack = () => {
    // Try to go to the providers list for the service category, or fallback to categories
    if (serviceDetails?.service_type?.category?.id) {
      navigate(`/client/providers/${serviceDetails.service_type.category.id}`);
    } else {
      navigate('/client/categories');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Navbar />
        <PageContainer title="Cargando..." subtitle="">
          <div className="max-w-4xl mx-auto space-y-6">
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
      </div>
    );
  }

  if (error || !serviceDetails) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <PageContainer title="Error" subtitle="">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">
            No se pudo cargar la información del servicio
          </p>
          <Button variant="outline" onClick={handleBack}>
            Volver
          </Button>
        </div>
      </PageContainer>
      </div>
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

  // Get provider level based on completed jobs (real achievement level)
  const providerLevel = getProviderLevelByJobs(completedJobsCount);
  
  // Get the real-time provider rating
  const providerRating = providerMerits?.averageRating || transformedProvider.rating;

  // Calcular si el proveedor es nuevo (menos de 30 días desde created_at)
  const isNewProvider = transformedProvider.joinDate ? 
    (new Date().getTime() - new Date(transformedProvider.joinDate).getTime()) / (1000 * 60 * 60 * 24) < 30 
    : false;

  // Obtener imagen de fondo (primera de la galería o avatar)
  const backgroundImage = transformedProvider.galleryImages?.[0] || transformedProvider.avatar;

  return (
    <>
      <Navbar />
      <PageContainer className="space-y-0 pb-24 px-0">
        {/* Hero Section */}
        <ServiceHeroSection
          backgroundImage={backgroundImage}
          avatar={transformedProvider.avatar}
          providerName={transformedProvider.name}
          serviceTitle={serviceDetails.title || 'Cargando...'}
        />

        {/* Metrics Grid */}
      <ServiceMetricsGrid 
        rating={providerRating}
        providerLevel={providerLevel.level}
      />

        {/* Service Detail Tabs */}
        <ServiceDetailTabs
          serviceDescription={serviceDetails.description || ''}
          serviceVariants={serviceDetails.serviceVariants || []}
          selectedVariants={selectedVariants}
          onSelectVariant={setSelectedVariants}
          onBookService={handleBookService}
          transformedProvider={transformedProvider}
          providerId={providerId!}
          providerLevel={providerLevel.level}
          currency={serviceDetails.currency}
        />
      </PageContainer>
      
      {/* Fixed booking button for mobile */}
      {selectedVariants.length > 0 && (
        <Button 
          onClick={handleBookService}
          className="fixed bottom-20 left-4 right-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl z-20 h-14 text-lg font-semibold rounded-xl sm:hidden"
        >
          Reservar ({selectedVariants.length})
        </Button>
      )}
    </>
  );
};

export default ClientProviderServiceDetail;
