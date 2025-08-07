import { isToday, isAfter, startOfWeek, endOfWeek, addWeeks, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { WeeklySlot } from '@/lib/weeklySlotTypes';
import { shouldHaveRecurrenceOn, OptimizedRecurrenceConfig } from '@/utils/optimizedRecurrenceSystem';

/**
 * Determines if we are looking at the current week
 */
export const isCurrentWeek = (weekIndex: number): boolean => {
  return weekIndex === 0;
};

/**
 * Calculates the correct date range for a specific week
 */
export const calculateWeekDateRange = (weekIndex: number): { startDate: Date, endDate: Date } => {
  const now = new Date();
  
  if (weekIndex === 0) {
    // Current week: complete Monday to Sunday week (not just from today)
    // This ensures we search all available slots for the week, then filter temporally later
    return {
      startDate: startOfWeek(now, { weekStartsOn: 1 }),
      endDate: endOfWeek(now, { weekStartsOn: 1 }) // Week starts on Monday
    };
  } else {
    // Future weeks: complete Monday to Sunday weeks
    const futureWeekStart = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), weekIndex);
    return {
      startDate: futureWeekStart,
      endDate: endOfWeek(futureWeekStart, { weekStartsOn: 1 })
    };
  }
};

/**
 * Gets the week label with date range
 */
export const getWeekLabel = (weekIndex: number): string => {
  const { startDate, endDate } = calculateWeekDateRange(weekIndex);
  
  if (weekIndex === 0) {
    return `Esta semana (hasta ${format(endDate, 'd MMM', { locale: es })})`;
  } else {
    return `Semana ${weekIndex + 1} (${format(startDate, 'd MMM', { locale: es })} - ${format(endDate, 'd MMM', { locale: es })})`;
  }
};

/**
 * Filters out past slots for the current week only
 * For future weeks, returns all available slots
 */
export const filterTemporalSlots = (slots: WeeklySlot[], weekIndex: number): WeeklySlot[] => {
  // If this is not the current week, return all available slots
  if (!isCurrentWeek(weekIndex)) {
    return slots.filter(slot => slot.isAvailable);
  }

  // For current week, filter out past slots and past days
  const now = new Date();
  const today = startOfDay(now);
  
  return slots.filter(slot => {
    if (!slot.isAvailable) return false;
    
    const slotDate = startOfDay(slot.date);
    
    // Filter out days that have already passed
    if (slotDate < today) {
      return false;
    }
    
    // For today's slots, only show future times
    if (isToday(slot.date)) {
      const slotDateTime = createSlotDateTime(slot.date, slot.time);
      return isAfter(slotDateTime, now);
    }
    
    // For future days this week, show all available slots
    return true;
  });
};

/**
 * Creates a proper datetime object from date and time string
 */
export const createSlotDateTime = (date: Date, timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const slotDateTime = new Date(date);
  slotDateTime.setHours(hours, minutes, 0, 0);
  return slotDateTime;
};

/**
 * Determines the appropriate context message for the week
 */
export const getWeekContextMessage = (
  weekIndex: number, 
  hasSlots: boolean, 
  totalAvailableSlots: number
): string => {
  if (isCurrentWeek(weekIndex)) {
    if (!hasSlots) {
      return 'No hay más horarios disponibles esta semana';
    }
    return `${totalAvailableSlots} horarios disponibles desde ahora`;
  } else {
    if (!hasSlots) {
      return `No hay horarios disponibles en la semana ${weekIndex + 1}`;
    }
    return `${totalAvailableSlots} horarios disponibles`;
  }
};

/**
 * Gets the appropriate navigation hint based on context
 */
export const getNavigationHint = (weekIndex: number, hasSlots: boolean): string => {
  if (isCurrentWeek(weekIndex) && !hasSlots) {
    return 'Intenta la próxima semana';
  }
  if (!isCurrentWeek(weekIndex) && !hasSlots) {
    return 'Intenta otra semana';
  }
  return '';
};

/**
 * Determines if a slot should be shown based on temporal context
 */
export const shouldShowSlot = (slot: WeeklySlot, weekIndex: number): boolean => {
  if (!slot.isAvailable) return false;
  
  if (!isCurrentWeek(weekIndex)) {
    return true; // Show all available slots for future weeks
  }
  
  // For current week, check if slot is in the future
  const now = new Date();
  const slotDateTime = createSlotDateTime(slot.date, slot.time);
  
  if (isToday(slot.date)) {
    return isAfter(slotDateTime, now);
  }
  
  return true;
};

/**
 * Converts recurrence string to OptimizedRecurrenceConfig
 */
const normalizeRecurrenceType = (recurrence: string): OptimizedRecurrenceConfig['type'] => {
  switch (recurrence?.toLowerCase()) {
    case 'weekly': return 'weekly';
    case 'biweekly': return 'biweekly';
    case 'triweekly': return 'triweekly';
    case 'monthly': return 'monthly';
    default: return 'once';
  }
};

/**
 * Filters slots based on recurrence pattern
 * Only shows slots that are valid for the chosen recurrence type
 */
export const filterSlotsByRecurrence = (slots: WeeklySlot[], recurrence: string = 'once'): WeeklySlot[] => {
  console.log('🔄 Iniciando filtrado por recurrencia:', {
    tipoRecurrencia: recurrence,
    totalSlots: slots.length,
    fechasSlots: slots.map(s => `${format(s.date, 'yyyy-MM-dd')} ${s.time}`).slice(0, 5)
  });

  // For 'once' recurrence, return all available slots without any filtering
  if (!recurrence || recurrence === 'once') {
    console.log('✅ Servicio "una vez" - devolviendo TODOS los slots disponibles sin filtrado');
    return slots;
  }

  const recurrenceType = normalizeRecurrenceType(recurrence);
  
  console.log('🔄 Aplicando filtrado de recurrencia para servicio recurrente:', {
    tipoRecurrencia: recurrenceType,
    totalSlots: slots.length
  });

  // For recurring services, we need a consistent start date for the pattern
  // Use the first slot's date as the base for the recurrence pattern
  const firstSlotDate = slots.length > 0 ? slots[0].date : new Date();
  
  const filteredSlots = slots.filter(slot => {
    try {
      // Create recurrence config with consistent start date
      const config: OptimizedRecurrenceConfig = {
        type: recurrenceType,
        startDate: firstSlotDate // Use consistent start date, not each slot's date
      };

      // Check if this slot date should have a recurrence occurrence
      const shouldShow = shouldHaveRecurrenceOn(slot.date, config);
      
      if (!shouldShow) {
        console.log(`❌ Slot eliminado por recurrencia: ${format(slot.date, 'yyyy-MM-dd')} ${slot.time} (no válido para ${recurrenceType})`);
      }
      
      return shouldShow;
    } catch (error) {
      console.error('Error validating slot for recurrence:', error);
      // En caso de error, conservar el slot para no bloquear la UI
      return true;
    }
  });

  console.log('🎯 Resultado del filtrado por recurrencia:', {
    slotsOriginales: slots.length,
    slotsFiltrados: filteredSlots.length,
    slotsEliminados: slots.length - filteredSlots.length,
    porcentajeRetenido: Math.round((filteredSlots.length / slots.length) * 100) + '%'
  });

  return filteredSlots;
};