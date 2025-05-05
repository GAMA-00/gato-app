
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
            users(
              avatar_url,
              created_at
            )
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
      
      console.log("Listings encontrados:", listings?.length);
      
      // Filtrar los anuncios por residencia si el cliente tiene una residencia asociada
      const filteredListings = clientResidenciaId 
        ? listings.filter(listing => 
            listing.listing_residencias.some(
              (lr: any) => lr.residencia_id === clientResidenciaId
            )
          )
        : listings;
      
      console.log("Listings filtrados por residencia:", filteredListings?.length);
      
      return filteredListings.map(listing => {
        // Extraemos los datos del provider de forma segura
        const provider = listing.provider as any || {};
        
        // Safely access nested users data with proper type checking
        let avatarUrl = null;
        let createdAt = new Date().toISOString();
        
        if (provider && typeof provider === 'object') {
          // Check if users exists and handle it accordingly
          const usersData = provider.users;
          
          if (usersData) {
            // Handle both array and object cases for users
            if (Array.isArray(usersData) && usersData.length > 0) {
              avatarUrl = usersData[0]?.avatar_url || null;
              createdAt = usersData[0]?.created_at || createdAt;
            } else if (typeof usersData === 'object') {
              avatarUrl = (usersData as any).avatar_url || null;
              createdAt = (usersData as any).created_at || createdAt;
            }
          }
        }

        // Obtener la categoría y subcategoría de forma segura
        let categoryName = '';
        let subcategoryName = '';
        
        if (listing.service_type) {
          subcategoryName = listing.service_type.name || '';
          if (listing.service_type.category) {
            categoryName = listing.service_type.category.name || '';
          }
        }
        
        return {
          id: provider?.id || '',
          name: provider?.name || 'Proveedor',
          avatar: avatarUrl,
          serviceId: listing.id || '',
          serviceName: listing.title || '',
          price: listing.base_price || 0,
          duration: listing.duration || 0,
          rating: provider?.average_rating || 0,
          experience: provider?.experience_years || 0,
          aboutMe: provider?.about_me || '',
          createdAt: createdAt,
          category: categoryName,
          subcategory: subcategoryName,
          // Incluir información sobre disponibilidad (por ahora asumimos disponible)
          isAvailable: true 
        } as ProcessedProvider;
      });
    },
    enabled: !!serviceId
  });
};
