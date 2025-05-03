
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProcessedProvider, ProviderData } from './types';

export const useProvidersQuery = (serviceId: string, categoryName: string) => {
  return useQuery({
    queryKey: ['available-providers', serviceId, categoryName],
    queryFn: async () => {
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
          )
        `)
        .eq('service_type_id', serviceId);
        
      if (error) throw error;
      
      return listings.map(listing => {
        // Extraemos los datos del provider de forma segura
        const provider = listing.provider as ProviderData || {};
        
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
          createdAt: createdAt
        } as ProcessedProvider;
      });
    }
  });
};
