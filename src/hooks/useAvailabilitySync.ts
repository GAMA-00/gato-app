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
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('availability, standard_duration, title, description, base_price, is_post_payment, service_variants')
        .eq('id', listingId)
        .eq('provider_id', user.id)
        .single();

      if (listingError || !listing) {
        return;
      }

      const weeklyAvailability = convertListingToWeeklyAvailability(listing.availability);

      const { error: deleteError } = await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', user.id);

      if (deleteError) {
        return;
      }

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
          return;
        }
      }

      const { error: updateError } = await supabase
        .from('listings')
        .update({
          availability: weeklyAvailability as any
        })
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .neq('id', listingId);

      if (updateError) {
        // Continue with slot regeneration
      }

      try {
        const { data: allListings } = await supabase
          .from('listings')
          .select('id, standard_duration, title')
          .eq('provider_id', user.id)
          .eq('is_active', true);

        if (allListings && allListings.length > 0) {
          if (forceSlotRegeneration) {
            await SlotSyncUtils.regenerateAllProviderSlots(
              user.id, 
              'Cambio en duración o disponibilidad detectado'
            );
          } else {
            for (const listingItem of allListings) {
              try {
                await supabase.rpc('regenerate_slots_for_listing', { 
                  p_listing_id: listingItem.id 
                });
              } catch (err) {
                // Continue with next listing
              }
            }
          }
          
          await SlotSyncUtils.logSlotStatus(user.id);
        }
      } catch (slotError) {
        // Slot regeneration error - continue
      }

      await queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
      await queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-slots'] });
      await queryClient.invalidateQueries({ queryKey: ['provider-slots'] });
      await queryClient.invalidateQueries({ queryKey: ['availability-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      
      queryClient.refetchQueries({ queryKey: ['provider-availability', user.id] });
      queryClient.refetchQueries({ queryKey: ['listings', user.id] });
      
    } catch (error) {
      toast.error('Error sincronizando disponibilidad');
    }
  }, [user?.id, convertListingToWeeklyAvailability, dayMapping, queryClient]);

  /**
   * Escucha cambios en la tabla listings para sincronizar automáticamente
   */
  useEffect(() => {
    if (!user?.id) return;

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
          const updatedListing = payload.new as any;
          
          const hasAvailabilityChange = updatedListing.availability;
          const hasDurationChange = updatedListing.standard_duration;
          const hasProfileChange = updatedListing.title || updatedListing.description || updatedListing.base_price;
          
          if (hasAvailabilityChange || hasDurationChange || hasProfileChange) {
            setTimeout(() => {
              const forceRegeneration = hasDurationChange || hasAvailabilityChange;
              syncFromServiceToConfig(updatedListing.id, forceRegeneration);
            }, 1500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, syncFromServiceToConfig]);

  /**
   * Sincroniza cambios de perfil del proveedor
   */
  const syncProviderProfile = useCallback(async (profileData: any) => {
    if (!user?.id) return;

    try {
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
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
      
      queryClient.refetchQueries({ queryKey: ['user-profile', user.id] });
      
      toast.success('Perfil actualizado en todas las secciones');

    } catch (error) {
      toast.error('Error actualizando perfil');
    }
  }, [user?.id, queryClient]);

  return {
    syncFromServiceToConfig,
    syncProviderProfile
  };
};
