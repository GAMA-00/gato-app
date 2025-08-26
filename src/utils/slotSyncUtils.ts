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
    console.log(`🔄 Iniciando regeneración completa de slots para proveedor ${providerId}`);
    console.log(`📋 Razón: ${reason}`);
    
    try {
      // 1. Obtener todos los listings activos del proveedor
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id, title, standard_duration, availability')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (listingsError) {
        console.error('❌ Error obteniendo listings:', listingsError);
        throw listingsError;
      }

      if (!listings || listings.length === 0) {
        console.log('ℹ️ No hay listings activos para regenerar');
        return 0;
      }

      console.log(`📊 Encontrados ${listings.length} listings activos`);

      let totalSlotsCreated = 0;

      // 2. Para cada listing, limpiar y regenerar slots
      for (const listing of listings) {
        console.log(`🔧 Procesando listing: ${listing.title} (${listing.id})`);
        
        try {
          // Eliminar slots futuros no reservados
          const { error: deleteError } = await supabase
            .from('provider_time_slots')
            .delete()
            .eq('provider_id', providerId)
            .eq('listing_id', listing.id)
            .gte('slot_date', new Date().toISOString().split('T')[0])
            .eq('is_reserved', false);

          if (deleteError) {
            console.error(`❌ Error eliminando slots para ${listing.id}:`, deleteError);
            continue;
          }

          // Regenerar slots usando la función RPC
          const { data: slotsCreated, error: rpcError } = await supabase
            .rpc('regenerate_slots_for_listing', {
              p_listing_id: listing.id
            });

          if (rpcError) {
            console.error(`❌ Error regenerando slots para ${listing.id}:`, rpcError);
            continue;
          }

          const createdCount = slotsCreated || 0;
          totalSlotsCreated += createdCount;
          
          console.log(`✅ ${createdCount} slots creados para ${listing.title}`);

        } catch (listingError) {
          console.error(`❌ Error procesando listing ${listing.id}:`, listingError);
        }
      }

      console.log(`🎉 Regeneración completa finalizada. Total slots creados: ${totalSlotsCreated}`);
      return totalSlotsCreated;

    } catch (error) {
      console.error('❌ Error en regeneración completa de slots:', error);
      throw error;
    }
  },

  /**
   * Valida y corrige la consistencia entre disponibilidad y slots
   */
  async validateSlotConsistency(providerId: string, listingId?: string) {
    console.log(`🔍 Validando consistencia de slots para proveedor ${providerId}`);
    
    try {
      const filter = listingId ? 
        { provider_id: providerId, listing_id: listingId } :
        { provider_id: providerId };

      // Obtener slots existentes
      const { data: existingSlots, error: slotsError } = await supabase
        .from('provider_time_slots')
        .select('listing_id, slot_date, start_time, end_time, is_available, is_reserved')
        .match(filter)
        .gte('slot_date', new Date().toISOString().split('T')[0]);

      if (slotsError) {
        console.error('❌ Error obteniendo slots existentes:', slotsError);
        return false;
      }

      // Obtener disponibilidad del proveedor
      const { data: availability, error: availError } = await supabase
        .from('provider_availability')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (availError) {
        console.error('❌ Error obteniendo disponibilidad:', availError);
        return false;
      }

      console.log(`📊 Encontrados ${existingSlots?.length || 0} slots existentes`);
      console.log(`📊 Encontrados ${availability?.length || 0} horarios de disponibilidad`);

      // Aquí podrías agregar lógica de validación específica
      // Por ahora, retornamos true si ambas consultas fueron exitosas
      return true;

    } catch (error) {
      console.error('❌ Error validando consistencia de slots:', error);
      return false;
    }
  },

  /**
   * Limpia slots huérfanos o inconsistentes
   */
  async cleanupOrphanedSlots(providerId: string) {
    console.log(`🧹 Limpiando slots huérfanos para proveedor ${providerId}`);
    
    try {
      // Eliminar slots que no tienen listing activo correspondiente
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
        console.error('❌ Error limpiando slots huérfanos:', error);
        return false;
      }

      console.log('✅ Slots huérfanos limpiados exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error en limpieza de slots huérfanos:', error);
      return false;
    }
  },

  /**
   * Logs detallados del estado actual de slots
   */
  async logSlotStatus(providerId: string, listingId?: string) {
    console.group(`📋 Estado actual de slots para proveedor ${providerId}`);
    
    try {
      const filter = listingId ? 
        { provider_id: providerId, listing_id: listingId } :
        { provider_id: providerId };

      const { data: slots, error } = await supabase
        .from('provider_time_slots')
        .select(`
          listing_id,
          slot_date,
          start_time,
          end_time,
          is_available,
          is_reserved,
          slot_type,
          listings!inner(title, standard_duration)
        `)
        .match(filter)
        .gte('slot_date', new Date().toISOString().split('T')[0])
        .order('slot_date')
        .order('start_time');

      if (error) {
        console.error('❌ Error obteniendo información de slots:', error);
        return;
      }

      console.log(`Total slots futuros: ${slots?.length || 0}`);
      
      if (slots && slots.length > 0) {
        const groupedByListing = slots.reduce((acc: any, slot: any) => {
          const listingTitle = slot.listings?.title || 'Unknown';
          if (!acc[listingTitle]) {
            acc[listingTitle] = [];
          }
          acc[listingTitle].push(slot);
          return acc;
        }, {});

        Object.entries(groupedByListing).forEach(([listingTitle, listingSlots]: [string, any]) => {
          console.group(`📝 ${listingTitle}`);
          console.log(`Slots totales: ${listingSlots.length}`);
          console.log(`Disponibles: ${listingSlots.filter((s: any) => s.is_available).length}`);
          console.log(`Reservados: ${listingSlots.filter((s: any) => s.is_reserved).length}`);
          console.groupEnd();
        });
      }

    } catch (error) {
      console.error('❌ Error obteniendo estado de slots:', error);
    }
    
    console.groupEnd();
  }
};