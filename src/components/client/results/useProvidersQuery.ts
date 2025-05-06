
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProcessedProvider } from './types';
import { useAuth } from '@/contexts/AuthContext';

export const useProvidersQuery = (serviceId: string, categoryName: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['available-providers', serviceId, categoryName, user?.id],
    queryFn: async () => {
      if (!serviceId) return [];
      
      console.log("Fetching providers for service ID:", serviceId, "and category:", categoryName);
      
      // Obtener el ID de la residencia del cliente actual
      let clientResidenciaId = null;
      if (user?.id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('residencia_id')
          .eq('id', user.id)
          .maybeSingle();
          
        clientResidenciaId = clientData?.residencia_id;
        console.log("Cliente residencia ID:", clientResidenciaId);
      }
      
      // Obtener todos los proveedores que ofrezcan este servicio
      const { data: listings, error } = await supabase
        .from('listings')
        .select(`
          *,
          provider:provider_id(
            id, 
            name, 
            about_me,
            experience_years,
            average_rating,
            certification_files
          ),
          service_type:service_type_id(
            name,
            category:category_id(
              name
            )
          ),
          listing_residencias(
            residencia_id
          )
        `)
        .eq('service_type_id', serviceId)
        .eq('is_active', true);
        
      if (error) {
        console.error("Error al obtener listings:", error);
        throw error;
      }
      
      console.log("Listings encontrados:", listings?.length, listings);
      
      // Filtrar los anuncios por residencia si el cliente tiene una residencia asociada
      let filteredListings = listings;
      
      if (clientResidenciaId) {
        filteredListings = listings.filter(listing => 
          listing.listing_residencias.some(
            (lr: any) => lr.residencia_id === clientResidenciaId
          )
        );
        console.log("Listings filtrados por residencia:", filteredListings?.length);
      }

      // Get appointments count to calculate recurring clients (mock data for now)
      // In a real implementation, you would query the appointments table
      const getRecurringClientsCount = (providerId: string) => {
        // Mock data - in a real application, this would be a database query
        return Math.floor(Math.random() * 10);
      };
      
      return filteredListings.map(listing => {
        // Extraemos los datos del provider de forma segura
        const provider = listing.provider as any || {};
        
        // Check if the provider has certifications based on certification_files
        const hasCertifications = provider.certification_files && 
                                 Array.isArray(provider.certification_files) && 
                                 provider.certification_files.length > 0;
        
        // Obtener la categoría y subcategoría de forma segura
        let categoryName = '';
        let subcategoryName = '';
        
        if (listing.service_type) {
          subcategoryName = listing.service_type.name || '';
          if (listing.service_type.category) {
            categoryName = listing.service_type.category.name || '';
          }
        }
        
        // For debugging
        console.log("Processing listing:", listing.title, "provider:", provider?.name, "category:", categoryName, "subcategory:", subcategoryName);
        
        return {
          id: provider?.id || '',
          name: provider?.name || 'Proveedor',
          avatar: null, // Los avatares vienen de la tabla users, pero removimos esa referencia por ahora
          serviceId: listing.id || '',
          serviceName: listing.title || '',
          price: listing.base_price || 0,
          duration: listing.duration || 0,
          rating: provider?.average_rating || 3.5, // Default rating if not available
          experience: provider?.experience_years || 0,
          aboutMe: provider?.about_me || '',
          createdAt: listing.created_at || new Date().toISOString(),
          category: categoryName,
          subcategory: subcategoryName,
          // Add new fields
          serviceImage: 'https://placehold.co/800x400?text=Servicio&font=montserrat', // Placeholder image for now
          hasCertifications: hasCertifications,
          recurringClients: getRecurringClientsCount(provider?.id || ''),
          // Incluir información sobre disponibilidad (por ahora asumimos disponible)
          isAvailable: true 
        } as ProcessedProvider;
      });
    },
    enabled: !!serviceId
  });
};
