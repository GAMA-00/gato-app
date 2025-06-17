import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
import ProviderCertifications from '@/components/client/service/ProviderCertifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BackButton from '@/components/ui/back-button';

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
  
  // Fetch REAL recurring clients count for this provider
  const { data: recurringClientsCount = 0 } = useQuery({
    queryKey: ['recurring-clients-real', providerId],
    queryFn: async () => {
      if (!providerId) return 0;
      
      console.log('Fetching REAL recurring clients count for provider:', providerId);
      
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('client_id')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .in('recurrence_type', ['weekly', 'biweekly', 'monthly']);
        
      if (error) {
        console.error('Error fetching recurring clients count:', error);
        return 0;
      }
      
      // Count unique clients
      const uniqueClients = new Set(data.map(rule => rule.client_id));
      const count = uniqueClients.size;
      
      console.log('Real recurring clients count:', count);
      console.log('Unique client IDs:', Array.from(uniqueClients));
      
      return count;
    },
    enabled: !!providerId
  });
  
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
      <div className="min-h-screen w-full bg-white relative">
        {/* Back button positioned absolutely flush with screen edge */}
        <div className="absolute top-4 left-0 z-10 pl-4">
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>

        <div className="pt-20 px-4">
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
        </div>
      </div>
    );
  }
  
  if (!serviceDetails) {
    return (
      <div className="min-h-screen w-full bg-white relative">
        {/* Back button positioned absolutely flush with screen edge */}
        <div className="absolute top-4 left-0 z-10 pl-4">
          <BackButton onClick={handleBack} />
        </div>

        <div className="pt-20 px-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No pudimos encontrar el perfil de este proveedor.</p>
          </div>
        </div>
      </div>
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

  // Calculate provider level based on account creation date
  const getProviderLevel = (createdAt?: string) => {
    if (!createdAt) return { level: 1, name: 'Nuevo' };
    
    const joinDate = new Date(createdAt);
    const now = new Date();
    const accountAgeInMonths = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    
    if (accountAgeInMonths < 3) return { level: 1, name: 'Nuevo' };
    if (accountAgeInMonths < 12) return { level: 2, name: 'Aprendiz' };
    if (accountAgeInMonths < 24) return { level: 3, name: 'Avanzado' };
    if (accountAgeInMonths < 36) return { level: 4, name: 'Experto' };
    return { level: 5, name: 'Maestro' };
  };

  const providerLevel = getProviderLevel(serviceDetails.provider?.created_at);
  
  // Use actual rating or default to 5.0 for new providers
  const displayRating = serviceDetails.provider?.average_rating && serviceDetails.provider.average_rating > 0 
    ? serviceDetails.provider.average_rating 
    : 5.0;
  
  return (
    <div className="min-h-screen w-full bg-white relative">
      {/* Back button positioned absolutely flush with screen edge */}
      <div className="absolute top-4 left-0 z-10 pl-4">
        <BackButton onClick={handleBack} />
      </div>

      {/* Main content with full width */}
      <div className="pt-20 px-4 pb-24 md:pb-6">
        <div className="w-full animate-fade-in">
          {/* Provider Header - Large Profile Section */}
          <div className="bg-white rounded-lg p-4 sm:p-8 mb-6 text-center w-full">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 mx-auto mb-4 border-4 border-app-border">
              <AvatarImage src={serviceDetails.provider?.avatar_url} alt={serviceDetails.provider?.name} />
              <AvatarFallback className="bg-app-cardAlt text-app-text text-xl sm:text-2xl">
                {serviceDetails.provider?.name?.substring(0, 2).toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-app-text mb-2">{serviceDetails.provider?.name || 'Proveedor'}</h1>
            
            {/* Metrics Row - Smaller icons on mobile */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
              {/* Calificación Promedio */}
              <div className="flex items-center bg-amber-50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-amber-200">
                <Star className="h-3 w-3 sm:h-5 sm:w-5 fill-amber-600 text-amber-600 mr-1 sm:mr-2" />
                <span className="font-medium text-amber-700 text-sm sm:text-lg">
                  {displayRating.toFixed(1)}
                </span>
              </div>
              
              {/* Clientes Recurrentes - Using REAL count */}
              <div className="flex items-center bg-amber-50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-amber-200">
                <Users className="h-3 w-3 sm:h-5 sm:w-5 text-amber-600 mr-1 sm:mr-2" />
                <span className="font-medium text-amber-700 text-sm sm:text-lg">{recurringClientsCount}</span>
                <span className="text-amber-600 text-xs sm:text-sm ml-1">recurrentes</span>
              </div>
              
              {/* Nivel del Proveedor */}
              <div className="flex items-center bg-amber-50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-amber-200">
                <Award className="h-3 w-3 sm:h-5 sm:w-5 text-amber-600 mr-1 sm:mr-2" />
                <span className="font-medium text-amber-700 text-sm sm:text-lg">{providerLevel.name}</span>
              </div>
              
              {/* Location Badge */}
              {serviceDetails.clientResidencia && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-100 flex items-center gap-1 px-2 sm:px-4 py-1.5 sm:py-2">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">{serviceDetails.clientResidencia.name}</span>
                </Badge>
              )}
            </div>
            
            {/* Service Description - Now showing the actual service description */}
            <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto whitespace-pre-line">
              {serviceDetails.description}
            </p>
            
            {/* Manual experience years - showing here as part of the profile summary */}
            {serviceDetails.provider.experience_years > 0 && (
              <div className="inline-block bg-stone-50 px-3 sm:px-4 py-2 rounded-md border border-stone-200 mt-4">
                <span className="text-xs sm:text-sm text-stone-700">
                  {serviceDetails.provider.experience_years} año{serviceDetails.provider.experience_years !== 1 ? 's' : ''} de experiencia profesional
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {/* Left Column: Gallery and Provider Info */}
            <div className="md:col-span-2 space-y-6 w-full">
              {/* Gallery - Showing all images */}
              <Card className="w-full">
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
            <div className="space-y-6 w-full">
              <BookingSummary
                selectedVariants={selectedVariants.length > 0 ? selectedVariants : [variants[0]]}
                onSchedule={handleSchedule}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientServiceDetail;
