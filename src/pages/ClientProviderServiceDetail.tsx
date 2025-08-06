import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceDetail } from '@/components/client/service/useServiceDetail';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import BackButton from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import ServiceDescription from '@/components/client/service/ServiceDescription';
import ProviderGallery from '@/components/providers/ProviderGallery';
import ProviderAbout from '@/components/providers/ProviderAbout';
import ProviderCertifications from '@/components/client/service/ProviderCertifications';
import ServiceVariantsSelector, { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import PriceInformation from '@/components/client/service/PriceInformation';
import LevelBadge from '@/components/achievements/LevelBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { getProviderLevelByJobs } from '@/lib/achievementTypes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProviderReviews from '@/components/providers/ProviderReviews';
import { useProviderMerits } from '@/hooks/useProviderMerits';
import EnhancedAvatar from '@/components/ui/enhanced-avatar';

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
      <div className="min-h-screen bg-gray-50">
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
      <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer title="Error" subtitle="">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">
            No se pudo cargar la información del servicio
          </p>
          <BackButton onClick={handleBack} />
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer title="" subtitle="">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Back button */}
          <div className="w-full">
            <BackButton onClick={handleBack} className="mb-4" />
          </div>

          {/* 1. Foto de Perfil, Nombre, Calificación y Nivel */}
          <div className="text-center space-y-4 w-full">
            <EnhancedAvatar 
              src={transformedProvider.avatar}
              alt={transformedProvider.name}
              fallback={transformedProvider.name.substring(0, 2).toUpperCase()}
              className="h-32 w-32 mx-auto border-4 border-luxury-navy shadow-lg"
              onError={() => console.error('ClientProviderServiceDetail: Avatar failed to load for', transformedProvider.name)}
              onLoad={() => console.log('ClientProviderServiceDetail: Avatar loaded for', transformedProvider.name)}
            />
            
            <div className="w-full px-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-luxury-navy mb-3 break-words leading-tight">
                {transformedProvider.name}
              </h1>
              
              {/* Calificación y Nivel de Experiencia */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                 <div className="flex items-center gap-2">
                   <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-lg">
                      {providerMerits?.averageRating?.toFixed(1) || transformedProvider.rating.toFixed(1)}
                    </span>
                 </div>
                <LevelBadge level={providerLevel.level} size="md" />
              </div>
            </div>
          </div>

          {/* 2. Descripción del servicio */}
          <div className="space-y-4 w-full">
            <h2 className="text-xl sm:text-2xl font-semibold text-luxury-navy">
              {serviceDetails.title}
            </h2>
            <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium mb-3">Descripción del servicio</h3>
              <p className="text-muted-foreground whitespace-pre-line text-sm sm:text-base leading-relaxed">
                {serviceDetails.description}
              </p>
            </div>
          </div>

          {/* 3. Galería de trabajos */}
          <div className="w-full">
            <ProviderGallery provider={transformedProvider} />
          </div>

          {/* 4. Sobre Mí */}
          <div className="w-full">
            <ProviderAbout provider={transformedProvider} />
          </div>

          {/* 5. Certificación Profesional */}
          <div className="w-full">
            <ProviderCertifications 
              certifications={transformedProvider.certificationFiles}
            />
          </div>

          {/* 6. Servicios Disponibles */}
          {serviceDetails.serviceVariants && serviceDetails.serviceVariants.length > 0 && (
            <div className="space-y-6 w-full">
              <div>
                <ServiceVariantsSelector
                  variants={serviceDetails.serviceVariants}
                  onSelectVariant={setSelectedVariants}
                />
              </div>
            </div>
          )}

          {/* 7. Comentarios de clientes */}
          <div className="w-full">
            <ProviderReviews provider={transformedProvider} />
          </div>

          {/* 8. Botón "Agendar Servicio" */}
          <div className="flex justify-center pt-6 pb-8 sm:pt-8 sm:pb-12 w-full">
            <Button 
              onClick={handleBookService}
              size="lg"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-base sm:text-lg px-8 sm:px-12 py-3 sm:py-4 shadow-lg"
              disabled={!serviceDetails?.serviceVariants || serviceDetails.serviceVariants.length === 0 || selectedVariants.length === 0}
            >
              <Calendar className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Agendar Servicio
            </Button>
          </div>
        </div>
      </PageContainer>
    </div>
  );
};

export default ClientProviderServiceDetail;
