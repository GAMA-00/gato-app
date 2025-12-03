import { supabase } from '@/integrations/supabase/client';

/**
 * Utilidad para manejar la regeneración completa de slots
 * cuando cambian parámetros críticos del servicio
 */
export const SlotSyncUtils = {
  
  /**
   * Regenera completamente todos los slots para un proveedor
   * Útil cuando cambia la duración del servicio o la disponibilidad
   */
  async regenerateAllProviderSlots(providerId: string, reason = 'Manual trigger') {
    try {
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id, title, standard_duration, availability')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (listingsError) {
        throw listingsError;
      }

      if (!listings || listings.length === 0) {
        return 0;
      }

      let totalSlotsCreated = 0;

      for (const listing of listings) {
        try {
          const { error: deleteError } = await supabase
            .from('provider_time_slots')
            .delete()
            .eq('provider_id', providerId)
            .eq('listing_id', listing.id)
            .gte('slot_date', new Date().toISOString().split('T')[0])
            .eq('is_reserved', false);

          if (deleteError) {
            continue;
          }

          const { data: slotsCreated, error: rpcError } = await supabase
            .rpc('regenerate_slots_for_listing', {
              p_listing_id: listing.id
            });

          if (rpcError) {
            continue;
          }

          const createdCount = slotsCreated || 0;
          totalSlotsCreated += createdCount;

        } catch (listingError) {
          // Continue with next listing
        }
      }

      return totalSlotsCreated;

    } catch (error) {
      throw error;
    }
  },

  /**
   * Valida y corrige la consistencia entre disponibilidad y slots
   */
  async validateSlotConsistency(providerId: string, listingId?: string) {
    try {
      const filter = listingId ? 
        { provider_id: providerId, listing_id: listingId } :
        { provider_id: providerId };

      const { data: existingSlots, error: slotsError } = await supabase
        .from('provider_time_slots')
        .select('listing_id, slot_date, start_time, end_time, is_available, is_reserved')
        .match(filter)
        .gte('slot_date', new Date().toISOString().split('T')[0]);

      if (slotsError) {
        return false;
      }

      const { data: availability, error: availError } = await supabase
        .from('provider_availability')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (availError) {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  },

  /**
   * Limpia slots huérfanos o inconsistentes
   */
  async cleanupOrphanedSlots(providerId: string) {
    try {
      const { error } = await supabase
        .from('provider_time_slots')
        .delete()
        .eq('provider_id', providerId)
        .not('listing_id', 'in', `(
          SELECT id FROM listings 
          WHERE provider_id = '${providerId}' 
          AND is_active = true
        )`);

      if (error) {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  },

  /**
   * Logs detallados del estado actual de slots
   */
  async logSlotStatus(providerId: string, listingId?: string) {
    // No-op: logging disabled
  }
};
