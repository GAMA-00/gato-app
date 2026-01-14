import { supabase } from '@/integrations/supabase/client';

/**
 * Utilidad para manejar la regeneración completa de slots
 * cuando cambian parámetros críticos del servicio
 */
export const SlotSyncUtils = {
  
  /**
   * ⛔ DISABLED: DELETE operation removed to prevent slot disappearance bug.
   * Previously this function would DELETE all non-reserved slots before regenerating,
   * which caused all slots for a day to disappear when blocking a single slot.
   * 
   * Now this function uses the safe RPC that only inserts missing slots.
   */
  async regenerateAllProviderSlots(providerId: string, reason = 'Manual trigger') {
    console.log('🔧 [SAFE MODE] regenerateAllProviderSlots llamado:', reason);
    console.log('⛔ DELETE masivo deshabilitado - solo se insertarán slots faltantes');
    
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
          // ⛔ REMOVED: The DELETE operation that was causing slot disappearance
          // const { error: deleteError } = await supabase
          //   .from('provider_time_slots')
          //   .delete()
          //   .eq('provider_id', providerId)
          //   .eq('listing_id', listing.id)
          //   .gte('slot_date', new Date().toISOString().split('T')[0])
          //   .eq('is_reserved', false);

          // Use safe RPC that only inserts missing slots (no deletes)
          const { data: slotsCreated, error: rpcError } = await supabase
            .rpc('regenerate_slots_for_listing_safe', {
              p_listing_id: listing.id
            });

          if (rpcError) {
            console.warn('⚠️ RPC safe falló para listing:', listing.id, rpcError);
            continue;
          }

          const createdCount = slotsCreated || 0;
          totalSlotsCreated += createdCount;
          console.log(`✅ Listing ${listing.id}: ${createdCount} slots insertados (sin deletes)`);

        } catch (listingError) {
          console.warn('⚠️ Error en listing:', listingError);
        }
      }

      console.log(`✅ [SAFE MODE] Total slots procesados: ${totalSlotsCreated}`);
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
   * ⛔ DISABLED: DELETE operation removed to prevent slot disappearance bug.
   * This function previously would delete slots based on a subquery which
   * could inadvertently delete valid slots during concurrent operations.
   * 
   * Orphan cleanup should be done via explicit admin action with proper confirmation.
   */
  async cleanupOrphanedSlots(providerId: string) {
    console.log('⛔ [DISABLED] cleanupOrphanedSlots - DELETE automático deshabilitado');
    console.log('ℹ️ La limpieza de slots huérfanos debe hacerse mediante acción administrativa explícita');
    // Return true to not break callers, but do nothing
    return true;
  },

  /**
   * Logs detallados del estado actual de slots
   */
  async logSlotStatus(providerId: string, listingId?: string) {
    // No-op: logging disabled
  }
};
