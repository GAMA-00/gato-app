
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import ProviderCard, { ProviderCardSkeleton } from './ProviderCard';
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
  
  // Fetch service info for navigation context
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
    
    // Navigate to the provider's service detail page for booking
    // Using the provider ID and their service ID
    const primaryService = selectedProvider.serviceId || selectedProvider.id;
    
    console.log("Navigating to service detail:", {
      providerId: selectedProvider.id,
      serviceId: primaryService
    });
    
    // Navigate to the service detail page where users can book
    navigate(`/client/service/${selectedProvider.id}/${primaryService}`, {
      state: { 
        fromResults: true,
        categoryName: categoryName,
        serviceTypeId: serviceId
      }
    });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4" aria-live="polite" aria-busy="true">
        {[1, 2, 3, 4].map(i => (
          <ProviderCardSkeleton key={i} />
        ))}
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
          <h2 className={`font-semibold ${isMobile ? 'text-lg' : 'text-xl'}`}>No se encontraron profesionales</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Single column layout with full width cards */}
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
