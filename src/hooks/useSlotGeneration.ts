import { useState, useEffect, useMemo } from 'react';
import { addDays, format, getDay, startOfDay } from 'date-fns';

export interface GeneratedSlot {
  id: string;
  day: string;
  date: Date;
  time: string;
  displayTime: string;
  period: 'AM' | 'PM';
  isEnabled: boolean;
  isManuallyDisabled: boolean;
}

export interface SlotGenerationConfig {
  availability: Record<string, {
    enabled: boolean;
    timeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  }>;
  serviceDuration: number; // in minutes
  daysAhead?: number;
}

const dayMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const dayLabels: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const useSlotGeneration = (config: SlotGenerationConfig) => {
  const [manuallyDisabledSlots, setManuallyDisabledSlots] = useState<Set<string>>(new Set());

  const formatTimeTo12Hour = (time24: string): { time: string; period: 'AM' | 'PM' } => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return {
      time: `${hours12}:${minutes.toString().padStart(2, '0')}`,
      period
    };
  };

  const generateTimeSlots = (startTime: string, endTime: string, duration: number): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    for (let currentMinutes = startMinutes; currentMinutes + duration <= endMinutes; currentMinutes += duration) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
    
    return slots;
  };

  const generatedSlots = useMemo(() => {
    const slots: GeneratedSlot[] = [];
    const today = startOfDay(new Date());
    const daysToGenerate = config.daysAhead || 7;

    for (let i = 0; i < daysToGenerate; i++) {
      const currentDate = addDays(today, i);
      const dayOfWeek = getDay(currentDate);
      const dayKey = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
      
      if (!dayKey || !config.availability[dayKey]?.enabled) {
        continue;
      }

      const dayAvailability = config.availability[dayKey];
      
      dayAvailability.timeSlots.forEach(timeSlot => {
        const timeSlots = generateTimeSlots(
          timeSlot.startTime,
          timeSlot.endTime,
          config.serviceDuration
        );

        timeSlots.forEach(time => {
          const { time: displayTime, period } = formatTimeTo12Hour(time);
          const slotId = `${format(currentDate, 'yyyy-MM-dd')}-${time}`;
          
          slots.push({
            id: slotId,
            day: dayLabels[dayOfWeek],
            date: currentDate,
            time,
            displayTime,
            period,
            isEnabled: !manuallyDisabledSlots.has(slotId),
            isManuallyDisabled: manuallyDisabledSlots.has(slotId)
          });
        });
      });
    }

    return slots;
  }, [config, manuallyDisabledSlots]);

  const toggleSlot = (slotId: string) => {
    setManuallyDisabledSlots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slotId)) {
        newSet.delete(slotId);
      } else {
        newSet.add(slotId);
      }
      return newSet;
    });
  };

  const enableAllSlots = () => {
    setManuallyDisabledSlots(new Set());
  };

  const disableAllSlots = () => {
    const allSlotIds = generatedSlots.map(slot => slot.id);
    setManuallyDisabledSlots(new Set(allSlotIds));
  };

  // Group slots by date for easier rendering
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, GeneratedSlot[]> = {};
    
    generatedSlots.forEach(slot => {
      const dateKey = format(slot.date, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(slot);
    });

    return grouped;
  }, [generatedSlots]);

  // Get unique dates for the grid headers
  const availableDates = useMemo(() => {
    const dates = generatedSlots.map(slot => slot.date);
    const uniqueDates = Array.from(new Set(dates.map(date => date.getTime())))
      .map(time => new Date(time))
      .sort((a, b) => a.getTime() - b.getTime());
    
    return uniqueDates;
  }, [generatedSlots]);

  const stats = useMemo(() => {
    const totalSlots = generatedSlots.length;
    const enabledSlots = generatedSlots.filter(slot => slot.isEnabled).length;
    const disabledSlots = totalSlots - enabledSlots;

    return {
      totalSlots,
      enabledSlots,
      disabledSlots,
      enabledPercentage: totalSlots > 0 ? Math.round((enabledSlots / totalSlots) * 100) : 0
    };
  }, [generatedSlots]);

  return {
    generatedSlots,
    slotsByDate,
    availableDates,
    stats,
    toggleSlot,
    enableAllSlots,
    disableAllSlots,
    manuallyDisabledSlots: Array.from(manuallyDisabledSlots)
  };
};