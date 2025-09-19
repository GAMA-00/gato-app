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
  
  // Check for direct appointment conflicts (only confirmed appointments count as real conflicts)
  const confirmedAppointments = conflictingAppointments?.filter(apt => 
    apt.status === 'confirmed'
  ) || [];
  
  const hasConfirmedConflict = confirmedAppointments.some(apt => {
    const aptStart = new Date(apt.start_time);
    const aptEnd = new Date(apt.end_time);
    return slotStart < aptEnd && slotEnd > aptStart;
  });

  // If there's a confirmed appointment, this slot is genuinely blocked
  if (hasConfirmedConflict) {
    const conflictingApt = confirmedAppointments.find(apt => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      return slotStart < aptEnd && slotEnd > aptStart;
    });
    
    const isRecurring = conflictingApt?.recurrence && conflictingApt.recurrence !== 'none';
    return { 
      isBlocked: true, 
      reason: isRecurring ? 'Bloqueado por cita recurrente' : 'Horario ocupado' 
    };
  }

  // Check database flags but validate against actual appointments
  if (!slot.is_available) {
    // If slot_type is manually_blocked, respect that
    if (slot.slot_type === 'manually_blocked') {
      return { isBlocked: true, reason: 'Bloqueado manualmente' };
    }
    
    // For recurring_blocked, only respect if there's actually a confirmed recurring appointment
    if (slot.recurring_blocked) {
      // If no confirmed appointment but marked as recurring_blocked, it might be stale data
      console.log(`⚠️ Slot marcado como recurring_blocked pero sin cita confirmada: ${slot.slot_datetime_start}`);
      return { isBlocked: false }; // Treat as available since no real conflict
    }
    
    // For other cases, check if there's a valid reason
    if (slot.is_reserved && slot.slot_type === 'reserved') {
      // Only block if there's actually a pending/confirmed appointment
      const hasPendingReservation = conflictingAppointments?.some(apt => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        return slotStart < aptEnd && slotEnd > aptStart && apt.status === 'pending';
      });
      
      if (hasPendingReservation) {
        return { isBlocked: true, reason: 'Reservado por cliente' };
      } else {
        console.log(`⚠️ Slot marcado como reservado pero sin reserva activa: ${slot.slot_datetime_start}`);
        return { isBlocked: false }; // Treat as available if no active reservation
      }
    }
    
    // Default case - check if slot should actually be available
    return { isBlocked: true, reason: 'No disponible' };
  }

  return { isBlocked: false };
};