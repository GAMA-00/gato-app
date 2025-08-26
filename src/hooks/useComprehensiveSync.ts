import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook para manejar la sincronización completa y en tiempo real
 * de todos los cambios relacionados con proveedores de servicios
 */
export const useComprehensiveSync = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id || user.role !== 'provider') return;

    console.log('🔗 Configurando sincronización comprehensiva en tiempo real...');

    // Channel para cambios en listings
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
          console.log('📡 Cambio en listings detectado:', payload.eventType);
          
          // Invalidar todos los caches relacionados con listings
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['listings'] }),
            queryClient.invalidateQueries({ queryKey: ['provider-availability'] }),
            queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] }),
            queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
            queryClient.invalidateQueries({ queryKey: ['unified-availability'] })
          ]);

          console.log('✅ Caches invalidados por cambio en listings');
        }
      )
      .subscribe();

    // Channel para cambios en perfil de usuario
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
          console.log('📡 Cambio en perfil de usuario detectado:', payload.new);
          
          // Invalidar todos los caches relacionados con el perfil
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
            queryClient.invalidateQueries({ queryKey: ['provider-profile'] }),
            queryClient.invalidateQueries({ queryKey: ['listings'] }),
            queryClient.invalidateQueries({ queryKey: ['providers'] })
          ]);

          // Refetch datos críticos
          queryClient.refetchQueries({ queryKey: ['user-profile', user.id] });
          
          console.log('✅ Perfil sincronizado en todas las secciones');
          toast.success('Perfil actualizado automáticamente');
        }
      )
      .subscribe();

    // Channel para cambios en availability del proveedor
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
          console.log('📡 Cambio en disponibilidad detectado:', payload.eventType);
          
          // Invalidar caches de disponibilidad
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['provider-availability'] }),
            queryClient.invalidateQueries({ queryKey: ['availability-settings'] }),
            queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] }),
            queryClient.invalidateQueries({ queryKey: ['weekly-slots'] })
          ]);

          console.log('✅ Disponibilidad sincronizada');
        }
      )
      .subscribe();

    // Channel para cambios en slots de tiempo
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
          console.log('📡 Cambio en slots detectado:', payload.eventType);
          
          // Invalidar caches de slots
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] }),
            queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
            queryClient.invalidateQueries({ queryKey: ['provider-slots'] }),
            queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] })
          ]);

          console.log('✅ Slots sincronizados');
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Limpiando listeners de sincronización comprehensiva');
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

    console.log('🔄 Forzando sincronización completa...');
    
    try {
      // Invalidar TODOS los caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['unified-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['availability-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] })
      ]);

      // Forzar refetch de datos críticos
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['listings', user.id] }),
        queryClient.refetchQueries({ queryKey: ['user-profile', user.id] }),
        queryClient.refetchQueries({ queryKey: ['provider-availability', user.id] })
      ]);

      console.log('✅ Sincronización completa exitosa');
      toast.success('Todas las secciones sincronizadas');

    } catch (error) {
      console.error('❌ Error en sincronización completa:', error);
      toast.error('Error sincronizando datos');
    }
  };

  return {
    forceFullSync
  };
};