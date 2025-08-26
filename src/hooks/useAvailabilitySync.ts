import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SlotSyncUtils } from '@/utils/slotSyncUtils';

interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  timeSlots: AvailabilitySlot[];
}

interface WeeklyAvailability {
  [key: string]: DayAvailability;
}

/**
 * Hook para sincronizar automáticamente la disponibilidad entre:
 * - Config Disponibilidad (provider_availability + listings.availability)
 * - Mis Servicios (listings.availability)
 * - Seleccione su disponibilidad (usado en booking)
 */
export const useAvailabilitySync = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const dayMapping = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  /**
   * Convierte availability de listings format a WeeklyAvailability format
   */
  const convertListingToWeeklyAvailability = useCallback((listingAvailability: any): WeeklyAvailability => {
    const result: WeeklyAvailability = {
      monday: { enabled: false, timeSlots: [] },
      tuesday: { enabled: false, timeSlots: [] },
      wednesday: { enabled: false, timeSlots: [] },
      thursday: { enabled: false, timeSlots: [] },
      friday: { enabled: false, timeSlots: [] },
      saturday: { enabled: false, timeSlots: [] },
      sunday: { enabled: false, timeSlots: [] }
    };

    if (!listingAvailability) return result;

    Object.entries(listingAvailability).forEach(([dayName, dayData]: [string, any]) => {
      if (dayData && typeof dayData === 'object') {
        result[dayName] = {
          enabled: dayData.enabled || false,
          timeSlots: dayData.timeSlots || []
        };
      }
    });

    return result;
  }, []);

  /**
   * Sincroniza los cambios de availability y duración desde el service form a Config Disponibilidad
   */
  const syncFromServiceToConfig = useCallback(async (listingId: string, forceSlotRegeneration = false) => {
    if (!user?.id) return;

    try {
      console.log('🔄 Sincronizando desde Mis Servicios a Config Disponibilidad...');
      
      // Obtener availability y otros campos relevantes del listing actualizado
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('availability, standard_duration, title, description, base_price, is_post_payment, service_variants')
        .eq('id', listingId)
        .eq('provider_id', user.id)
        .single();

      if (listingError || !listing) {
        console.error('Error obteniendo listing:', listingError);
        return;
      }

      const weeklyAvailability = convertListingToWeeklyAvailability(listing.availability);
      console.log('📋 Availability convertida:', weeklyAvailability);

      // Actualizar provider_availability table
      // Eliminar entries existentes
      const { error: deleteError } = await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', user.id);

      if (deleteError) {
        console.error('Error eliminando availability anterior:', deleteError);
        return;
      }

      // Insertar nuevas entries
      const slotsToInsert: Array<{
        provider_id: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_active: boolean;
      }> = [];

      Object.entries(weeklyAvailability).forEach(([dayName, dayData]) => {
        if (dayData.enabled && dayData.timeSlots.length > 0) {
          const dayOfWeek = dayMapping[dayName as keyof typeof dayMapping];
          
          dayData.timeSlots.forEach(slot => {
            slotsToInsert.push({
              provider_id: user.id,
              day_of_week: dayOfWeek,
              start_time: slot.startTime,
              end_time: slot.endTime,
              is_active: true
            });
          });
        }
      });

      if (slotsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('provider_availability')
          .insert(slotsToInsert);

        if (insertError) {
          console.error('Error insertando nueva availability:', insertError);
          return;
        }
      }

      // Sincronizar a TODOS los listings activos del proveedor
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          availability: weeklyAvailability as any // Cast to satisfy Supabase Json type
        })
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .neq('id', listingId); // Excluir el listing que ya se actualizó

      if (updateError) {
        console.error('Error sincronizando a otros listings:', updateError);
      }

      // Regenerar slots para todos los listings (especialmente si cambió la duración o hay forzado)
      try {
        const { data: allListings } = await supabase
          .from('listings')
          .select('id, standard_duration, title')
          .eq('provider_id', user.id)
          .eq('is_active', true);

        if (allListings && allListings.length > 0) {
          console.log('🔄 Regenerando slots para todos los listings activos...');
          
          if (forceSlotRegeneration) {
            // Si hay cambios importantes, usar regeneración completa
            const slotsCreated = await SlotSyncUtils.regenerateAllProviderSlots(
              user.id, 
              'Cambio en duración o disponibilidad detectado'
            );
            console.log(`✅ Regeneración completa: ${slotsCreated} slots creados`);
          } else {
            // Regeneración estándar por listing
            for (const listingItem of allListings) {
              try {
                const { error: rpcError } = await supabase.rpc('regenerate_slots_for_listing', { 
                  p_listing_id: listingItem.id 
                });

                if (rpcError) {
                  console.error(`Error regenerando slots para ${listingItem.title}:`, rpcError);
                } else {
                  console.log(`✅ Slots regenerados para ${listingItem.title}`);
                }
              } catch (err) {
                console.error(`Error procesando listing ${listingItem.title}:`, err);
              }
            }
          }
          
          // Log del estado final
          await SlotSyncUtils.logSlotStatus(user.id);
          
        } else {
          console.log('ℹ️ No hay listings activos para regenerar slots');
        }
      } catch (slotError) {
        console.warn('⚠️ Error regenerando slots:', slotError);
      }

      // Invalidar TODOS los caches para actualizar UI completamente
      await queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
      await queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-slots'] });
      await queryClient.invalidateQueries({ queryKey: ['provider-slots'] });
      await queryClient.invalidateQueries({ queryKey: ['availability-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      
      // Forzar refetch de datos críticos
      queryClient.refetchQueries({ queryKey: ['provider-availability', user.id] });
      queryClient.refetchQueries({ queryKey: ['listings', user.id] });

      console.log('✅ Sincronización completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en sincronización desde service:', error);
      toast.error('Error sincronizando disponibilidad');
    }
  }, [user?.id, convertListingToWeeklyAvailability, dayMapping, queryClient]);

  /**
   * Escucha cambios en la tabla listings para sincronizar automáticamente
   */
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔗 Configurando listener para sincronización automática');

    const channel = supabase
      .channel(`availability-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'listings',
          filter: `provider_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Cambio detectado en listing:', payload);
          const updatedListing = payload.new as any;
          
          // Sincronizar si cambió availability, duración, o información del perfil
          const hasAvailabilityChange = updatedListing.availability;
          const hasDurationChange = updatedListing.standard_duration;
          const hasProfileChange = updatedListing.title || updatedListing.description || updatedListing.base_price;
          
          if (hasAvailabilityChange || hasDurationChange || hasProfileChange) {
            console.log('🔄 Cambios detectados:', {
              availability: hasAvailabilityChange,
              duration: hasDurationChange,
              profile: hasProfileChange
            });
            
            setTimeout(() => {
              const forceRegeneration = hasDurationChange || hasAvailabilityChange;
              syncFromServiceToConfig(updatedListing.id, forceRegeneration);
            }, 1500); // Delay para evitar conflicts
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Limpiando listener de sincronización');
      supabase.removeChannel(channel);
    };
  }, [user?.id, syncFromServiceToConfig]);

  /**
   * Sincroniza cambios de perfil del proveedor
   */
  const syncProviderProfile = useCallback(async (profileData: any) => {
    if (!user?.id) return;

    try {
      console.log('🔄 Sincronizando perfil del proveedor...');
      
      // Actualizar tabla users
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: profileData.name,
          about_me: profileData.about_me,
          experience_years: profileData.experience_years,
          certification_files: profileData.certification_files,
          avatar_url: profileData.avatar_url,
          phone: profileData.phone
        })
        .eq('id', user.id);

      if (userError) {
        console.error('Error actualizando perfil de usuario:', userError);
        return;
      }

      // Invalidar caches de perfil
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
      
      // Refetch datos críticos
      queryClient.refetchQueries({ queryKey: ['user-profile', user.id] });
      
      console.log('✅ Perfil sincronizado exitosamente');
      toast.success('Perfil actualizado en todas las secciones');

    } catch (error) {
      console.error('❌ Error sincronizando perfil:', error);
      toast.error('Error actualizando perfil');
    }
  }, [user?.id, queryClient]);

  return {
    syncFromServiceToConfig,
    syncProviderProfile
  };
};