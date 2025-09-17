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
  // Show all days with slots (both available and unavailable) to provide complete availability picture
  // This ensures enabled days are always visible even if all slots are booked
  return slotGroups.filter(group => group.slots.length > 0);
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
  
  // Check for direct appointment conflicts (confirmed appointments)
  const hasDirectConflict = conflictingAppointments?.some(apt => {
    const aptStart = new Date(apt.start_time);
    const aptEnd = new Date(apt.end_time);
    return slotStart < aptEnd && slotEnd > aptStart;
  }) || false;

  if (hasDirectConflict) {
    return { isBlocked: true, reason: 'Horario ocupado' };
  }

  // Only check database availability if there's no confirmed appointment
  if (!slot.is_available) {
    // For recurring_blocked, only block if there's an actual confirmed appointment
    if (slot.recurring_blocked) {
      // If recurring_blocked but no confirmed appointment, it should be available
      if (!hasDirectConflict) {
        console.log(`⚠️ Slot marcado como recurring_blocked pero sin cita confirmada: ${slot.slot_datetime_start}`);
        return { isBlocked: false };
      }
      return { isBlocked: true, reason: 'Bloqueado por cita recurrente' };
    }
    if (slot.slot_type === 'provider_rejected') {
      return { isBlocked: true, reason: 'Horario rechazado por el proveedor' };
    }
    if (slot.slot_type === 'manually_blocked') {
      return { isBlocked: true, reason: 'Bloqueado manualmente' };
    }
    if (slot.is_reserved) {
      return { isBlocked: true, reason: 'Reservado por cliente' };
    }
    return { isBlocked: true, reason: 'No disponible' };
  }

  return { isBlocked: false };
};