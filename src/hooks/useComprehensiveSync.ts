import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  invalidateListings, 
  invalidateProviderAvailability,
  invalidateProviderSlots,
  invalidateUserProfile,
  forceFullProviderSync
} from '@/utils/queryInvalidation';

/**
 * Hook para manejar la sincronización completa y en tiempo real
 * de todos los cambios relacionados con proveedores de servicios
 */
export const useComprehensiveSync = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id || user.role !== 'provider') return;

    const listingsChannel = supabase
      .channel(`comprehensive-listings-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings',
          filter: `provider_id=eq.${user.id}`
        },
        async (payload) => {
          await invalidateListings(queryClient, user.id);
          await invalidateProviderAvailability(queryClient, user.id);
        }
      )
      .subscribe();

    const userProfileChannel = supabase
      .channel(`comprehensive-users-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        async (payload) => {
          await invalidateUserProfile(queryClient, user.id);
          await invalidateListings(queryClient, user.id);
          queryClient.refetchQueries({ queryKey: ['user-profile', user.id] });
          toast.success('Perfil actualizado automáticamente');
        }
      )
      .subscribe();

    const availabilityChannel = supabase
      .channel(`comprehensive-availability-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_availability',
          filter: `provider_id=eq.${user.id}`
        },
        async (payload) => {
          await invalidateProviderAvailability(queryClient, user.id);
        }
      )
      .subscribe();

    const slotsChannel = supabase
      .channel(`comprehensive-slots-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_time_slots',
          filter: `provider_id=eq.${user.id}`
        },
        async (payload) => {
          await invalidateProviderSlots(queryClient, user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(listingsChannel);
      supabase.removeChannel(userProfileChannel);
      supabase.removeChannel(availabilityChannel);
      supabase.removeChannel(slotsChannel);
    };
  }, [user?.id, user?.role, queryClient]);

  /**
   * Función para forzar la sincronización manual de todos los datos
   */
  const forceFullSync = async () => {
    if (!user?.id) return;
    
    try {
      await forceFullProviderSync(queryClient, user.id);
      toast.success('Todas las secciones sincronizadas');
    } catch (error) {
      toast.error('Error sincronizando datos');
    }
  };

  return {
    forceFullSync
  };
};
