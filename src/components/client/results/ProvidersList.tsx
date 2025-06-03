
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import ProviderCard from './ProviderCard';

interface ProvidersListProps {
  categoryName: string;
  serviceId: string;
}

const ProvidersList = ({ categoryName, serviceId }: ProvidersListProps) => {
  console.log("ProvidersList rendered with:", { categoryName, serviceId });
  
  const { data: providers, isLoading, error } = useQuery({
    queryKey: ['providers', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      
      console.log("Fetching providers for serviceId:", serviceId);
      
      // Fetch listings (services) that match the service type
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select(`
          *,
          provider:provider_id (
            id,
            name,
            email,
            phone,
            avatar_url,
            about_me,
            average_rating,
            experience_years,
            certification_files
          )
        `)
        .eq('service_type_id', serviceId)
        .eq('is_active', true);
        
      if (listingsError) {
        console.error("Error fetching listings:", listingsError);
        throw listingsError;
      }
      
      console.log("Raw listings data:", listings);
      
      // Transform and group by provider
      const providersMap = new Map();
      
      listings?.forEach(listing => {
        if (listing.provider) {
          const providerId = listing.provider.id;
          
          if (!providersMap.has(providerId)) {
            providersMap.set(providerId, {
              ...listing.provider,
              services: []
            });
          }
          
          providersMap.get(providerId).services.push({
            id: listing.id,
            title: listing.title,
            description: listing.description,
            duration: listing.duration,
            base_price: listing.base_price,
            service_variants: listing.service_variants,
            gallery_images: listing.gallery_images
          });
        }
      });
      
      const providersArray = Array.from(providersMap.values());
      console.log("Transformed providers:", providersArray);
      
      return providersArray;
    },
    enabled: !!serviceId
  });
  
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
        {providers.map((provider: any) => (
          <ProviderCard 
            key={provider.id} 
            provider={provider}
            categoryName={categoryName}
          />
        ))}
      </div>
    </div>
  );
};

export default ProvidersList;
