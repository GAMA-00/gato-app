import { format } from 'date-fns';
import { WeeklySlot, WeeklySlotGroup, WeeklySlotStats } from '@/lib/weeklySlotTypes';

export const createSlotSignature = (
  providerId: string,
  listingId: string,
  serviceDuration: number,
  recurrence: string,
  baseDate: Date,
  endDate: Date
): string => {
  return `${providerId}-${listingId}-${serviceDuration}-${recurrence}-${format(baseDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
};

export const groupSlotsByDate = (slots: WeeklySlot[]): WeeklySlotGroup[] => {
  const grouped: Record<string, WeeklySlot[]> = {};
  
  slots.forEach(slot => {
    const dateKey = format(slot.date, 'yyyy-MM-dd');
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(slot);
  });

  return Object.entries(grouped)
    .map(([dateKey, daySlots]) => {
      const date = daySlots[0].date;
      return {
        date,
        dayName: format(date, 'EEEE'),
        dayNumber: date.getDate(),
        dayMonth: format(date, 'MMM'),
        slots: daySlots.sort((a, b) => a.time.localeCompare(b.time))
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const filterAvailableSlotGroups = (slotGroups: WeeklySlotGroup[]): WeeklySlotGroup[] => {
  // For client booking, show all days with slots (even if empty)
  // This ensures provider-configured days are always visible
  return slotGroups;
};

export const calculateSlotStats = (
  slots: WeeklySlot[], 
  slotGroups: WeeklySlotGroup[], 
  availableSlotGroups: WeeklySlotGroup[]
): WeeklySlotStats => {
  const totalSlots = slots.length;
  const availableSlots = slots.filter(slot => slot.isAvailable).length;
  const daysWithSlots = slotGroups.length;
  const daysWithAvailableSlots = availableSlotGroups.length;

  return {
    totalSlots,
    availableSlots,
    daysWithSlots,
    daysWithAvailableSlots,
    availabilityRate: totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0
  };
};

export const shouldBlockSlot = (
  slot: any,
  conflictingAppointments: any[]
): { isBlocked: boolean; reason?: string } => {
  const slotStart = new Date(slot.slot_datetime_start);
  const slotEnd = new Date(slot.slot_datetime_end);
  
  // Check if manually disabled
  const isManuallyDisabled = !slot.is_available;
  if (isManuallyDisabled) {
    return { isBlocked: true, reason: 'Horario no disponible' };
  }

  // Check conflicts with appointments
  const hasDirectConflict = conflictingAppointments?.some(apt => {
    const aptStart = new Date(apt.start_time);
    const aptEnd = new Date(apt.end_time);
    return slotStart < aptEnd && slotEnd > aptStart;
  }) || false;

  if (hasDirectConflict) {
    return { isBlocked: true, reason: 'Horario ocupado' };
  }

  return { isBlocked: false };
};