import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook para sincronizar automáticamente los cambios de perfil
 * del proveedor en todas las secciones de la aplicación
 */
export const useProfileSync = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Sincroniza cambios de perfil a todas las vistas relevantes
   */
  const syncProfileChanges = useCallback(async (profileData: any) => {
    if (!user?.id) return;

    try {
      console.log('🔄 Sincronizando cambios de perfil en todas las secciones...');
      
      // Actualizar tabla users con nueva información
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: profileData.name,
          about_me: profileData.about_me,
          experience_years: profileData.experience_years,
          certification_files: profileData.certification_files,
          avatar_url: profileData.avatar_url,
          phone: profileData.phone,
          email: profileData.email
        })
        .eq('id', user.id);

      if (userError) {
        console.error('Error actualizando perfil de usuario:', userError);
        throw userError;
      }

      // Actualizar información en todos los listings activos si aplica
      if (profileData.name || profileData.about_me) {
        const { error: listingError } = await supabase
          .from('listings')
          .update({
            // Si el nombre cambió, podríamos actualizar algún campo relacionado
            updated_at: new Date().toISOString()
          })
          .eq('provider_id', user.id)
          .eq('is_active', true);

        if (listingError) {
          console.warn('Warning actualizando listings:', listingError);
        }
      }

      // Invalidar TODOS los caches relacionados con el perfil
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-info'] }),
        queryClient.invalidateQueries({ queryKey: ['providers'] })
      ]);
      
      // Forzar refetch de datos críticos
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['user-profile', user.id] }),
        queryClient.refetchQueries({ queryKey: ['listings', user.id] })
      ]);
      
      console.log('✅ Perfil sincronizado exitosamente en todas las secciones');
      toast.success('Perfil actualizado correctamente');

    } catch (error) {
      console.error('❌ Error sincronizando perfil:', error);
      toast.error('Error actualizando perfil');
      throw error;
    }
  }, [user?.id, queryClient]);

  /**
   * Fuerza la sincronización completa del perfil
   */
  const forceSyncProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Obtener datos actuales del perfil
      const { data: currentProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !currentProfile) {
        console.error('Error obteniendo perfil actual:', error);
        return;
      }

      await syncProfileChanges(currentProfile);
    } catch (error) {
      console.error('Error en forceSyncProfile:', error);
    }
  }, [user?.id, syncProfileChanges]);

  return {
    syncProfileChanges,
    forceSyncProfile
  };
};