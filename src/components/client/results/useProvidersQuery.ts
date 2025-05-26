
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
  provider_id: string;
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
      
      console.log("=== STARTING PROVIDERS QUERY ===");
      console.log(`Fetching providers for service type: ${serviceTypeId} in category: ${categoryName}`);
      console.log(`Client residencia ID: ${user?.residenciaId || 'Not set'}`);
      
      // Get current auth status
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Auth status for providers query:", session ? "Authenticated" : "Not authenticated");
      
      // Get listings with provider data from users table
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          base_price,
          duration,
          provider_id,
          listing_residencias (
            residencia_id
          ),
          is_active
        `)
        .eq('service_type_id', serviceTypeId)
        .eq('is_active', true);
        
      if (listingsError) {
        console.error("Error fetching listings:", listingsError);
        toast({
          title: "Error al cargar profesionales",
          description: "No pudimos cargar los profesionales disponibles. Inténtalo de nuevo más tarde.",
          variant: "destructive"
        });
        return [];
      }
      
      console.log(`✅ Found ${listingsData?.length || 0} active listings`);
      
      if (!listingsData || listingsData.length === 0) {
        console.log("No listings found for service type:", serviceTypeId);
        return [];
      }
      
      // Get unique provider IDs
      const providerIds = [...new Set(listingsData.map(listing => listing.provider_id))];
      console.log("Unique provider IDs to fetch:", providerIds);
      
      // Fetch provider data from users table with more flexible approach
      console.log("=== FETCHING PROVIDERS DATA ===");
      const { data: providers, error: providersError } = await supabase
        .from('users')
        .select(`
          id, 
          name, 
          experience_years,
          about_me,
          average_rating,
          certification_files
        `)
        .in('id', providerIds);
        
      if (providersError) {
        console.error("Error fetching providers:", providersError);
        console.error("Providers error details:", {
          code: providersError.code,
          message: providersError.message,
          details: providersError.details,
          hint: providersError.hint
        });
      }
      
      console.log(`✅ Fetched ${providers?.length || 0} providers from users table`);
      console.log("Providers data:", providers);
      
      // If no providers found, create default provider data to avoid empty results
      let processedProviders: ProviderData[] = [];
      
      if (!providers || providers.length === 0) {
        console.log("⚠️ No providers found in users table, creating default provider data");
        // Create default provider data for each provider ID
        processedProviders = providerIds.map(providerId => ({
          id: providerId,
          name: 'Profesional',
          experience_years: 0,
          about_me: '',
          average_rating: 4.0,
          certification_files: null
        }));
      } else {
        processedProviders = providers;
        
        // For any missing providers, add default data
        const foundProviderIds = new Set(providers.map(p => p.id));
        const missingProviderIds = providerIds.filter(id => !foundProviderIds.has(id));
        
        if (missingProviderIds.length > 0) {
          console.log("Creating default data for missing providers:", missingProviderIds);
          const defaultProviders = missingProviderIds.map(providerId => ({
            id: providerId,
            name: 'Profesional',
            experience_years: 0,
            about_me: '',
            average_rating: 4.0,
            certification_files: null
          }));
          processedProviders = [...providers, ...defaultProviders];
        }
      }
      
      // Create provider map for easy lookup
      const providerMap = Object.fromEntries(
        processedProviders.map(provider => [provider.id, provider])
      );
      
      // Create a fully typed listings array with provider data
      const listings: ListingWithProvider[] = listingsData.map(listing => ({
        ...listing,
        provider: providerMap[listing.provider_id] || {
          id: listing.provider_id,
          name: 'Profesional',
          experience_years: 0,
          about_me: '',
          average_rating: 4.0,
          certification_files: null
        }
      }));
      
      // Filter listings based on residencia_id if user is logged in
      let filteredListings = listings;
      
      if (user?.residenciaId) {
        filteredListings = listings.filter(listing => {
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
      const finalProcessedProviders: ProcessedProvider[] = filteredListings.map(listing => {
        const provider = listing.provider;
        
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
          createdAt: new Date().toISOString(),
          isAvailable: true, // Default to available
          category: categoryName,
          serviceImage: 'https://placehold.co/800x600?text=Servicio',
          hasCertifications,
          recurringClients,
          servicesCompleted
        };
      });
      
      console.log("=== FINAL PROCESSED PROVIDERS ===");
      console.log(`Returning ${finalProcessedProviders.length} processed providers`);
      console.log("First provider (if any):", finalProcessedProviders[0]);
      
      // Sort by rating (highest first)
      return finalProcessedProviders.sort((a, b) => b.rating - a.rating);
    },
    enabled: !!serviceTypeId && !!categoryName,
    retry: 1, // Only retry once to avoid infinite loops
    refetchOnWindowFocus: false
  });
};
