
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import ProviderCard from './ProviderCard';
import { useProvidersQuery } from './useProvidersQuery';
import { useNavigate } from 'react-router-dom';

interface ProvidersListProps {
  categoryName: string;
  serviceId: string;
}

const ProvidersList = ({ categoryName, serviceId }: ProvidersListProps) => {
  console.log("ProvidersList rendered with:", { categoryName, serviceId });
  const navigate = useNavigate();
  
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
    
    // Get the selected provider's first service for booking
    const primaryService = selectedProvider.serviceId || selectedProvider.id;
    const serviceName = selectedProvider.serviceName || serviceInfo?.name || 'Servicio';
    const providerName = selectedProvider.name || 'Proveedor';
    const price = selectedProvider.price || 0;
    const duration = selectedProvider.duration || 60;
    
    // Create comprehensive booking data
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
    
    console.log("Navigating to booking summary with data:", bookingData);
    
    // Navigate with state data for immediate access
    navigate('/client/booking-summary', {
      state: { bookingData },
      replace: false
    });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Buscando profesionales...</h2>
          <p className="text-muted-foreground">Esto puede tomar unos segundos</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar los profesionales. Por favor, inténtalo de nuevo.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!providers || providers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">No se encontraron profesionales</h2>
          <p className="text-muted-foreground mb-6">
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {providers.length} profesional{providers.length !== 1 ? 'es' : ''} disponible{providers.length !== 1 ? 's' : ''}
        </h2>
        <p className="text-muted-foreground">
          Selecciona el profesional que prefieras para tu servicio
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <ProviderCard 
            key={provider.id} 
            provider={provider}
            onClick={handleProviderSelection}
          />
        ))}
      </div>
    </div>
  );
};

export default ProvidersList;
