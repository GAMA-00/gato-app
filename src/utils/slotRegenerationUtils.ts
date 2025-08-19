import { format, addMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ProviderAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface TimeSlot {
  slot_date: string;
  start_time: string;
  slot_datetime_start: string;
}

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

      // Conjunto de horas permitidas para este día según disponibilidad
      const allowedTimes = new Set<string>();
      
      for (const avail of dayAvailability) {
        // Generar slots para este período de disponibilidad
        const startTime = new Date(`1970-01-01T${avail.start_time}`);
        const endTime = new Date(`1970-01-01T${avail.end_time}`);
        
        let currentSlotTime = startTime;
        while (currentSlotTime < endTime) {
          const timeString = format(currentSlotTime, 'HH:mm:ss');
          allowedTimes.add(timeString);
          
          // Verificar si este slot ya existe
          const existingSlot = existingSlots.find(slot => 
            slot.slot_date === dateString && 
            slot.start_time === timeString
          );
          
          if (!existingSlot) {
            // Crear el slot faltante
            const localDate = new Date(currentDate);
            localDate.setHours(currentSlotTime.getHours(), currentSlotTime.getMinutes(), 0, 0);
            
            const slotStartDateTime = new Date(`${dateString}T${timeString}`);
            const slotEndDateTime = addMinutes(slotStartDateTime, serviceDuration);
            
            slotsToCreate.push({
              provider_id: providerId,
              listing_id: listingId,
              slot_date: dateString,
              start_time: timeString,
              end_time: format(slotEndDateTime, 'HH:mm:ss'),
              slot_datetime_start: slotStartDateTime.toISOString(),
              slot_datetime_end: slotEndDateTime.toISOString(),
              is_available: true,
              is_reserved: false,
              slot_type: 'generated'
            });
            
            console.log(`✨ Slot faltante: ${dateString} ${timeString}`);
          }
          
          // Avanzar al siguiente slot
          currentSlotTime = addMinutes(currentSlotTime, serviceDuration);
        }
      }

      // Detectar y marcar para eliminación los slots fuera de horario configurado
      const existingForDate = existingSlots.filter(s => s.slot_date === dateString);
      const extras = existingForDate.filter((s: any) =>
        !allowedTimes.has(s.start_time) && s.is_reserved !== true && (s.slot_type === undefined || s.slot_type === 'generated')
      );
      if (extras.length) {
        if (!slotsToDeleteByDate[dateString]) slotsToDeleteByDate[dateString] = new Set<string>();
        extras.forEach((s: any) => slotsToDeleteByDate[dateString].add(s.start_time));
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
    
    const { error } = await supabase
      .from('provider_time_slots')
      .insert(slotsToCreate);
    
    if (error) {
      console.error('❌ Error al crear slots faltantes:', error);
      throw error;
    } else {
      console.log(`✅ ${slotsToCreate.length} slots creados exitosamente`);
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