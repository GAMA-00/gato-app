import { format, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { WeeklySlot, WeeklySlotGroup, WeeklySlotStats } from '@/lib/weeklySlotTypes';

export const createWeeklySlot = (slotData: any): WeeklySlot => {
  const startTime = new Date(slotData.slot_datetime_start);
  const endTime = new Date(slotData.slot_datetime_end);
  const timeStr = format(startTime, 'h:mm', { locale: es });
  const period = format(startTime, 'a', { locale: es }).toUpperCase() as 'AM' | 'PM';
  const displayTime = `${timeStr} ${period}`;

  return {
    id: slotData.id,
    date: startOfDay(startTime),
    time: timeStr,
    displayTime,
    period,
    startTime,
    endTime,
    isAvailable: slotData.is_available && !slotData.is_reserved && !slotData.is_manually_disabled,
    isManuallyDisabled: slotData.is_manually_disabled || false,
    hasConflict: !slotData.is_available && slotData.is_reserved,
    conflictReason: !slotData.is_available ? 'Ocupado' : undefined
  };
};

export const groupSlotsByDate = (slots: WeeklySlot[]): WeeklySlotGroup[] => {
  const groupsMap = new Map<string, WeeklySlotGroup>();

  slots.forEach(slot => {
    const dateKey = format(slot.date, 'yyyy-MM-dd');
    
    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, {
        date: slot.date,
        dayName: format(slot.date, 'EEEE', { locale: es }),
        dayNumber: slot.date.getDate(),
        dayMonth: `${slot.date.getDate()} ${format(slot.date, 'MMM', { locale: es })}`,
        month: format(slot.date, 'MMM', { locale: es }),
        slots: []
      });
    }
    
    groupsMap.get(dateKey)!.slots.push(slot);
  });

  // Ordenar slots dentro de cada grupo
  groupsMap.forEach(group => {
    group.slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  });

  return Array.from(groupsMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const filterAvailableSlotGroups = (slotGroups: WeeklySlotGroup[]): WeeklySlotGroup[] => {
  return slotGroups.filter(group => 
    group.slots.some(slot => slot.isAvailable)
  );
};

export const calculateSlotStats = (slots: WeeklySlot[]): WeeklySlotStats => {
  const totalSlots = slots.length;
  const availableSlots = slots.filter(slot => slot.isAvailable).length;
  const unavailableSlots = totalSlots - availableSlots;
  
  const uniqueDates = new Set(slots.map(slot => format(slot.date, 'yyyy-MM-dd')));
  const daysWithSlots = uniqueDates.size;
  
  const daysWithAvailableSlots = new Set(
    slots
      .filter(slot => slot.isAvailable)
      .map(slot => format(slot.date, 'yyyy-MM-dd'))
  ).size;
  
  const averageSlotsPerDay = daysWithSlots > 0 ? totalSlots / daysWithSlots : 0;

  return {
    totalSlots,
    availableSlots,
    unavailableSlots,
    daysWithSlots,
    daysWithAvailableSlots,
    averageSlotsPerDay: Math.round(averageSlotsPerDay * 10) / 10
  };
};

export const createParamsSignature = (params: {
  providerId: string;
  listingId: string;
  serviceDuration: number;
  recurrence: string | null;
  baseDate: Date;
  endDate: Date;
}): string => {
  return `${params.providerId}-${params.listingId}-${params.serviceDuration}-${params.recurrence}-${format(params.baseDate, 'yyyy-MM-dd')}-${format(params.endDate, 'yyyy-MM-dd')}`;
};