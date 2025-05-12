
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProcessedProvider, ProviderData } from './types';
import { useAuth } from '@/contexts/AuthContext';

interface ListingWithProvider {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration: number;
  is_active: boolean;
  provider: ProviderData;
}

export const useProvidersQuery = (serviceTypeId: string, categoryName: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['providers-for-service', serviceTypeId, categoryName, user?.id, user?.residenciaId],
    queryFn: async () => {
      if (!serviceTypeId) {
        console.error("No service type ID provided to useProvidersQuery");
        return [];
      }
      
      console.log(`Fetching providers for service type: ${serviceTypeId} in category: ${categoryName}`);
      console.log(`Client residencia ID: ${user?.residenciaId || user?.buildingId || 'Not set'}`);
      
      // First get listings for this service type
      let query = supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          base_price,
          duration,
          provider:provider_id (
            id, 
            name, 
            experience_years,
            about_me,
            average_rating,
            certification_files,
            created_at
          ),
          is_active
        `)
        .eq('service_type_id', serviceTypeId)
        .eq('is_active', true);
        
      const { data: listings, error: listingsError } = await query;
        
      if (listingsError) {
        console.error("Error fetching listings:", listingsError);
        return [];
      }
      
      console.log(`Found ${listings.length} active listings`);
      
      // For each listing, check if the provider serves the client's residencia
      const filteredListings = [];
      
      for (const listing of listings) {
        // Skip listings without a provider
        if (!listing.provider) continue;
        
        // Check if the provider serves the client's residencia
        if (user?.residenciaId || user?.buildingId) {
          const residenciaId = user.residenciaId || user.buildingId;
          
          const { data: providerResidencias } = await supabase
            .from('provider_residencias')
            .select('residencia_id')
            .eq('provider_id', listing.provider.id);
            
          // Only include providers that serve the client's residencia
          const servesResidencia = providerResidencias?.some(pr => pr.residencia_id === residenciaId);
          
          if (!servesResidencia) {
            console.log(`Provider ${listing.provider.name} does not serve residencia ${residenciaId}`);
            continue;
          }
          console.log(`Provider ${listing.provider.name} serves residencia ${residenciaId}`);
        }
        
        filteredListings.push(listing);
      }
      
      console.log(`Filtered to ${filteredListings.length} listings that serve client's residencia`);
      
      // Process and return the providers with their service details
      const providers: ProcessedProvider[] = (filteredListings as ListingWithProvider[]).map(listing => {
        const provider = listing.provider || {};
        const hasCertifications = provider.certification_files && 
                                Array.isArray(provider.certification_files) && 
                                provider.certification_files.length > 0;
                                
        // Generate a random number of recurring clients and services completed for demo
        const recurringClients = Math.floor(Math.random() * 10);
        const servicesCompleted = Math.floor(Math.random() * 50) + 5;
        
        return {
          id: provider.id || '',
          name: provider.name || 'Profesional',
          avatar: null, // Placeholder for provider avatar
          serviceId: listing.id,
          serviceName: listing.title,
          price: listing.base_price,
          duration: listing.duration,
          rating: provider.average_rating || 4.5,
          experience: provider.experience_years || 0,
          aboutMe: provider.about_me || '',
          createdAt: provider.created_at || new Date().toISOString(),
          isAvailable: true, // Default to available
          category: categoryName,
          serviceImage: 'https://placehold.co/800x600?text=Servicio',
          hasCertifications,
          recurringClients,
          servicesCompleted
        };
      });
      
      // Sort by rating (highest first)
      return providers.sort((a, b) => b.rating - a.rating);
    },
    enabled: !!serviceTypeId && !!categoryName
  });
};
