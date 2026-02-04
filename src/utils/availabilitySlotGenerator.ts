import { format, addMinutes } from 'date-fns';

export interface ProviderAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface GeneratedSlot {
  provider_id: string;
  listing_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  slot_datetime_start: string;
  slot_datetime_end: string;
  is_available: boolean;
  is_reserved: boolean;
  slot_type: string;
}

/**
 * Generates slots ensuring the service fits completely within availability windows
 * STANDARDIZED: Always uses 30-minute slots (global system update 2026-02)
 */
export const generateAvailabilitySlots = (
  providerId: string,
  listingId: string,
  date: Date,
  availability: ProviderAvailability[],
  serviceDuration: number // Now used only to validate fit, not for slot size
): GeneratedSlot[] => {
  const dayOfWeek = date.getDay();
  const dateString = format(date, 'yyyy-MM-dd');
  const slots: GeneratedSlot[] = [];
  
  // STANDARDIZED: Fixed 30-minute slot duration
  const SLOT_DURATION = 30;

  // Find availability for this specific day
  const dayAvailability = availability.filter(av => 
    av.day_of_week === dayOfWeek && av.is_active
  );

  for (const avail of dayAvailability) {
    const startTime = new Date(`1970-01-01T${avail.start_time}`);
    const endTime = new Date(`1970-01-01T${avail.end_time}`);
    
    let currentSlotTime = startTime;
    
    // Generate 30-minute slots within availability window
    while (currentSlotTime < endTime) {
      const slotEndTime = addMinutes(currentSlotTime, SLOT_DURATION);
      
      // Check if slot fits completely within availability window
      if (slotEndTime <= endTime) {
        const timeString = format(currentSlotTime, 'HH:mm:ss');
        const endTimeString = format(slotEndTime, 'HH:mm:ss');
        
        // Create complete datetime for the slot
        const [year, month, day] = dateString.split('-').map(Number);
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        const slotStartDateTime = new Date(year, month - 1, day, hours, minutes || 0, seconds || 0);
        const slotEndDateTime = addMinutes(slotStartDateTime, SLOT_DURATION);
        
        slots.push({
          provider_id: providerId,
          listing_id: listingId,
          slot_date: dateString,
          start_time: timeString,
          end_time: endTimeString,
          slot_datetime_start: slotStartDateTime.toISOString(),
          slot_datetime_end: slotEndDateTime.toISOString(),
          is_available: true,
          is_reserved: false,
          slot_type: 'generated'
        });
        
        console.log(`✅ Generated 30min slot: ${dateString} ${timeString} - ${endTimeString}`);
      }
      
      // Always advance by fixed 30-minute duration
      currentSlotTime = addMinutes(currentSlotTime, SLOT_DURATION);
    }
  }
  
  return slots;
};

/**
 * Generates slots from listing availability JSON format for client fallback
 * STANDARDIZED: Always uses 30-minute slots (global system update 2026-02)
 */
export const generateListingSlots = (
  providerId: string,
  listingId: string,
  date: Date,
  listingAvailability: any,
  serviceDuration: number // Now used only to validate fit, not for slot size
): GeneratedSlot[] => {
  if (!listingAvailability) return [];
  
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = dayKeys[date.getDay()];
  const dayCfg = listingAvailability[dayKey];
  
  if (!dayCfg?.enabled || !Array.isArray(dayCfg.timeSlots)) return [];
  
  const dateString = format(date, 'yyyy-MM-dd');
  const slots: GeneratedSlot[] = [];
  
  // STANDARDIZED: Fixed 30-minute slot duration
  const SLOT_DURATION = 30;
  
  for (const timeWindow of dayCfg.timeSlots) {
    const [startHour, startMin] = timeWindow.startTime.split(':').map(Number);
    const [endHour, endMin] = timeWindow.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Generate 30-minute slots where slot fits completely
    for (let currentMin = startMinutes; currentMin + SLOT_DURATION <= endMinutes; currentMin += SLOT_DURATION) {
      const slotHour = Math.floor(currentMin / 60);
      const slotMin = currentMin % 60;
      const slotEndMin = currentMin + SLOT_DURATION;
      const slotEndHour = Math.floor(slotEndMin / 60);
      const slotEndMinute = slotEndMin % 60;
      
      const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}:00`;
      const endTimeString = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMinute.toString().padStart(2, '0')}:00`;
      
      // Create complete datetime for the slot
      const [year, month, day] = dateString.split('-').map(Number);
      const slotStartDateTime = new Date(year, month - 1, day, slotHour, slotMin, 0);
      const slotEndDateTime = addMinutes(slotStartDateTime, SLOT_DURATION);
      
      slots.push({
        provider_id: providerId,
        listing_id: listingId,
        slot_date: dateString,
        start_time: timeString,
        end_time: endTimeString,
        slot_datetime_start: slotStartDateTime.toISOString(),
        slot_datetime_end: slotEndDateTime.toISOString(),
        is_available: true,
        is_reserved: false,
        slot_type: 'generated'
      });
      
      console.log(`📋 Generated 30min listing slot: ${dateString} ${timeString} - ${endTimeString}`);
    }
  }
  
  return slots;
};