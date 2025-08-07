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
  existingSlots: TimeSlot[]
): Promise<void> => {
  console.log('🔧 Verificando slots faltantes...');
  
  const serviceDuration = 60; // 1 hora por defecto
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
      
      for (const avail of dayAvailability) {
        // Generar slots para este período de disponibilidad
        const startTime = new Date(`1970-01-01T${avail.start_time}`);
        const endTime = new Date(`1970-01-01T${avail.end_time}`);
        
        let currentSlotTime = startTime;
        while (currentSlotTime < endTime) {
          const timeString = format(currentSlotTime, 'HH:mm:ss');
          
          // Verificar si este slot ya existe
          const existingSlot = existingSlots.find(slot => 
            slot.slot_date === dateString && 
            slot.start_time === timeString
          );
          
          if (!existingSlot) {
            // Crear el slot faltante
            const slotStartDateTime = new Date(currentDate);
            slotStartDateTime.setHours(currentSlotTime.getHours(), currentSlotTime.getMinutes(), 0, 0);
            
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
    }
    
    // Avanzar al siguiente día, pero no salir del rango de la semana
    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate > endDateTime) break;
  }
  
  // Insertar slots faltantes si los hay
  if (slotsToCreate.length > 0) {
    console.log(`🚀 Creando ${slotsToCreate.length} slots faltantes...`);
    
    const { error } = await supabase
      .from('provider_time_slots')
      .insert(slotsToCreate);
    
    if (error) {
      console.error('❌ Error creando slots:', error);
      throw error;
    } else {
      console.log(`✅ ${slotsToCreate.length} slots creados exitosamente`);
    }
  } else {
    console.log('✅ Todos los slots ya existen');
  }
};