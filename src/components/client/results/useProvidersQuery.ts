
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProcessedProvider, ProviderData } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface ListingWithProvider {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration: number;
  is_active: boolean;
  provider: ProviderData;
  listing_residencias?: { residencia_id: string }[];
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
      console.log(`Client residencia ID: ${user?.residenciaId || 'Not set'}`);
      
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
          listing_residencias (
            residencia_id
          ),
          is_active
        `)
        .eq('service_type_id', serviceTypeId)
        .eq('is_active', true);
        
      const { data: listings, error: listingsError } = await query;
        
      if (listingsError) {
        console.error("Error fetching listings:", listingsError);
        toast({
          title: "Error al cargar profesionales",
          description: "No pudimos cargar los profesionales disponibles. Inténtalo de nuevo más tarde.",
          variant: "destructive"
        });
        return [];
      }
      
      console.log(`Found ${listings?.length || 0} active listings`);
      
      // Filter listings based on residencia_id if user is logged in
      let filteredListings = listings as ListingWithProvider[] || [];
      
      if (user?.residenciaId) {
        filteredListings = filteredListings.filter(listing => {
          // If no residencias are specified, it means the provider serves all residencias
          if (!listing.listing_residencias || listing.listing_residencias.length === 0) {
            return true;
          }
          
          // Check if the provider serves the client's residencia
          return listing.listing_residencias.some(lr => lr.residencia_id === user.residenciaId);
        });
        
        console.log(`Filtered to ${filteredListings.length} listings that serve client's residencia`);
      }
      
      // Process and return the providers with their service details
      const providers: ProcessedProvider[] = filteredListings.map(listing => {
        // Safely access provider data with appropriate type checking
        const provider = listing.provider as ProviderData || {};
        
        // Safely check if provider has certifications
        const certFiles = provider.certification_files || [];
        const hasCertifications = Array.isArray(certFiles) && certFiles.length > 0;
                                
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
