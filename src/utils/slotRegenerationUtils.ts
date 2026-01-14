import { format, addMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { generateAvailabilitySlots, ProviderAvailability } from './availabilitySlotGenerator';

interface TimeSlot {
  slot_date: string;
  start_time: string;
  slot_datetime_start: string;
}

/**
 * Normaliza formato de tiempo a HH:mm:ss para comparaciones consistentes
 */
const normalizeTimeFormat = (time: string): string => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  if (parts.length === 3) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  return time;
};

/**
 * Asegura que todos los slots configurados existan en la base de datos
 */
export const ensureAllSlotsExist = async (
  providerId: string,
  listingId: string,
  startDate: Date,
  endDate: Date,
  availability: ProviderAvailability[],
  existingSlots: TimeSlot[],
  serviceDuration: number
): Promise<void> => {
  console.log('🔧 [SAFE MODE] Verificando slots faltantes (sin deletes)...');
  const slotsToCreate: any[] = [];
  
  // Iterar por cada día en el rango EXACTO
  const currentDate = new Date(startDate);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999); // Incluir todo el último día
  
  while (currentDate <= endDateTime) {
    const dayOfWeek = currentDate.getDay();
    const dateString = format(currentDate, 'yyyy-MM-dd');
    
    // Buscar disponibilidad para este día
    const dayAvailability = availability.filter(av => 
      av.day_of_week === dayOfWeek && av.is_active
    );
    
    if (dayAvailability.length > 0) {
      console.log(`📅 Verificando ${dateString} (día ${dayOfWeek}):`, dayAvailability.length, 'configuraciones');

      // Use centralized slot generation with "full fit" validation
      const daySlots = generateAvailabilitySlots(
        providerId,
        listingId,
        currentDate,
        dayAvailability,
        serviceDuration
      );

      for (const generatedSlot of daySlots) {
        const normalizedGenTime = normalizeTimeFormat(generatedSlot.start_time);
        
        // Check if this slot already exists (compare normalized times)
        const existingSlot = existingSlots.find(slot => 
          slot.slot_date === dateString && 
          normalizeTimeFormat(slot.start_time) === normalizedGenTime
        );
        
        if (!existingSlot) {
          slotsToCreate.push(generatedSlot);
          console.log(`✨ Slot faltante: ${dateString} ${generatedSlot.start_time}`);
        }
      }

      // ⛔ DISABLED: No longer delete "extra" slots
      // This was causing slots to disappear when blocking/unblocking
      // Slots should only be modified explicitly, never auto-deleted during fetch
    }
    
    // Avanzar al siguiente día, pero no salir del rango de la semana
    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate > endDateTime) break;
  }
  
  // Insertar slots faltantes si los hay usando upsert para evitar errores de duplicados
  if (slotsToCreate.length > 0) {
    console.log(`🚀 Creando ${slotsToCreate.length} slots faltantes con upsert...`);
    
    // Normalizar formato de tiempo a HH:mm:ss antes de insertar
    const normalizedSlots = slotsToCreate.map(slot => ({
      ...slot,
      start_time: slot.start_time.padEnd(8, ':00').substring(0, 8),
      end_time: slot.end_time.padEnd(8, ':00').substring(0, 8)
    }));
    
    const { error } = await supabase
      .from('provider_time_slots')
      .upsert(normalizedSlots, {
        onConflict: 'provider_id,listing_id,slot_datetime_start',
        ignoreDuplicates: true
      });
    
    if (error) {
      console.error('❌ Error en upsert de slots:', error);
      // Don't throw - just log. This prevents fetch failures from breaking the UI
      console.warn('⚠️ Continuando sin los slots nuevos para no romper la UI');
    } else {
      console.log(`✅ ${normalizedSlots.length} slots procesados exitosamente (upsert)`);
    }
  } else {
    console.log('✅ Todos los slots ya existen');
  }

  // ⛔ DISABLED: Delete logic removed entirely
  // Previously this would delete "extra" slots outside configured hours,
  // but this was incorrectly deleting valid slots when configurations changed
  // or when blocking/unblocking triggered a refetch.
  console.log('✅ [SAFE MODE] Regeneración completada sin eliminaciones');
};