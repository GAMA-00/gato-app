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
  console.log('🔧 Verificando slots faltantes...');
  const slotsToCreate: any[] = [];
  const slotsToDeleteByDate: Record<string, Set<string>> = {};
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

      // Track allowed times for cleanup logic (normalized for consistent comparison)
      const allowedTimes = new Set<string>();
      
      for (const generatedSlot of daySlots) {
        const normalizedGenTime = normalizeTimeFormat(generatedSlot.start_time);
        allowedTimes.add(normalizedGenTime);
        
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

      // Detectar y marcar para eliminación los slots fuera de horario configurado (más estricto)
      const existingForDate = existingSlots.filter(s => s.slot_date === dateString);
      const extras = existingForDate.filter((s: any) => {
        // Solo eliminar slots generados automáticamente que no están en el horario configurado
        const isGenerated = s.slot_type === 'generated' || !s.slot_type;
        const isNotReserved = s.is_reserved !== true;
        // Use normalized time comparison
        const isOutsideConfig = !allowedTimes.has(normalizeTimeFormat(s.start_time));
        const isAvailable = s.is_available === true;
        
        return isGenerated && isNotReserved && isOutsideConfig && isAvailable;
      });
      
      if (extras.length) {
        if (!slotsToDeleteByDate[dateString]) slotsToDeleteByDate[dateString] = new Set<string>();
        extras.forEach((s: any) => {
          slotsToDeleteByDate[dateString].add(s.start_time);
          console.log(`🧹 Marcando slot extra para eliminar: ${dateString} ${s.start_time} (tipo: ${s.slot_type})`);
        });
        console.log(`🧹 Se marcaron ${extras.length} slots fuera de horario para eliminar en ${dateString}`);
      }
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
      throw error;
    } else {
      console.log(`✅ ${normalizedSlots.length} slots procesados exitosamente (upsert)`);
    }
  } else {
    console.log('✅ Todos los slots ya existen');
  }

  // Eliminar slots fuera de horario configurado (no reservados) dentro del rango
  for (const [date, timesSet] of Object.entries(slotsToDeleteByDate)) {
    const times = Array.from(timesSet);
    if (!times.length) continue;

    console.log(`🧽 Eliminando ${times.length} slots fuera de horario para ${date}`);
    const { error: delError } = await supabase
      .from('provider_time_slots')
      .delete()
      .eq('provider_id', providerId)
      .eq('listing_id', listingId)
      .eq('slot_date', date)
      .in('start_time', times)
      .eq('is_reserved', false)
      .eq('is_available', true);

    if (delError) {
      console.warn('⚠️ No se pudieron eliminar algunos slots fuera de horario:', delError);
    } else {
      console.log(`🗑️ Slots fuera de horario eliminados para ${date}:`, times);
    }
  }
};