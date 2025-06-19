
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import ProviderCard from './ProviderCard';
import { useProvidersQuery } from './useProvidersQuery';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProvidersListProps {
  categoryName: string;
  serviceId: string;
}

const ProvidersList = ({ categoryName, serviceId }: ProvidersListProps) => {
  console.log("ProvidersList rendered with:", { categoryName, serviceId });
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const { data: providers, isLoading, error } = useProvidersQuery(serviceId, categoryName);
  
  // Fetch service info for booking data
  const { data: serviceInfo } = useQuery({
    queryKey: ['service-info', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      
      const { data, error } = await supabase
        .from('service_types')
        .select('*, category:category_id(name, label)')
        .eq('id', serviceId)
        .single();
        
      if (error) {
        console.error("Error fetching service info:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!serviceId
  });
  
  const handleProviderSelection = (selectedProvider: any) => {
    console.log("Provider selected:", selectedProvider);
    
    // Get the selected provider's first service for navigation
    const primaryService = selectedProvider.serviceId || selectedProvider.id;
    const serviceName = selectedProvider.serviceName || serviceInfo?.name || 'Servicio';
    const providerName = selectedProvider.name || 'Proveedor';
    const price = selectedProvider.price || 0;
    const duration = selectedProvider.duration || 60;
    
    // Create comprehensive booking data to pass as state
    const bookingData = {
      serviceId: primaryService,
      serviceName: serviceName,
      providerId: selectedProvider.id,
      providerName: providerName,
      price: price,
      duration: duration,
      startTime: null,
      notes: '',
      frequency: 'once',
      requiresScheduling: true
    };
    
    console.log("Navigating to service detail with data:", bookingData);
    
    // Navigate to service detail page (provider profile) with booking data
    navigate(`/client/service/${selectedProvider.id}/${primaryService}`, {
      state: { bookingData },
      replace: false
    });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className={`font-bold mb-2 ${isMobile ? 'text-lg' : 'text-2xl'}`}>Buscando profesionales...</h2>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>Esto puede tomar unos segundos</p>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="w-full">
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    console.error("Error in ProvidersList:", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar los profesionales: {error.message}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!providers || providers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h2 className={`font-semibold mb-4 ${isMobile ? 'text-lg' : 'text-xl'}`}>No se encontraron profesionales</h2>
          <p className={`text-muted-foreground mb-6 ${isMobile ? 'text-sm' : 'text-base'}`}>
            No hay profesionales disponibles para este servicio en este momento.
          </p>
          <p className="text-sm text-muted-foreground">
            Intenta con otro servicio o vuelve más tarde.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className={`font-bold mb-2 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
          Profesionales disponibles
        </h2>
        <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
          {providers.length} profesional{providers.length !== 1 ? 'es' : ''} encontrado{providers.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      {/* Single column layout for mobile with full width cards */}
      <div className="flex flex-col gap-4 w-full">
        {providers.map((provider) => (
          <div key={provider.id} className="w-full">
            <ProviderCard 
              provider={provider}
              onClick={handleProviderSelection}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProvidersList;
