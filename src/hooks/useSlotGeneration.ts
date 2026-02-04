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

export const useSlotGeneration = (
  config: SlotGenerationConfig, 
  onSlotPreferencesChange?: (preferences: Record<string, boolean>) => void,
  initialSlotPreferences?: Record<string, boolean>
) => {
  const [manuallyDisabledSlots, setManuallyDisabledSlots] = useState<Set<string>>(new Set());
  const [permanentSlotPreferences, setPermanentSlotPreferences] = useState<Record<string, boolean>>(
    initialSlotPreferences || {}
  );

  // Initialize with provided preferences
  useEffect(() => {
    if (initialSlotPreferences) {
      setPermanentSlotPreferences(initialSlotPreferences);
    }
  }, [initialSlotPreferences]);

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
    
    // STANDARDIZED: Always use 30-minute intervals for slot generation (global system 2026-02)
    const SLOT_INTERVAL = 30;
    
    for (let currentMinutes = startMinutes; currentMinutes + SLOT_INTERVAL <= endMinutes; currentMinutes += SLOT_INTERVAL) {
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
          
          // Create a permanent pattern key (day-time) for recurring blocks
          const patternKey = `${dayKey}-${time}`;
          const isPermanentlyDisabled = permanentSlotPreferences[patternKey] === false;
          const isTemporarilyDisabled = manuallyDisabledSlots.has(slotId);
          
          slots.push({
            id: slotId,
            day: dayLabels[dayOfWeek],
            date: currentDate,
            time,
            displayTime,
            period,
            isEnabled: !isPermanentlyDisabled && !isTemporarilyDisabled,
            isManuallyDisabled: isPermanentlyDisabled || isTemporarilyDisabled
          });
        });
      });
    }

    return slots;
  }, [config, manuallyDisabledSlots, permanentSlotPreferences]);

  const toggleSlot = (slotId: string) => {
    // Extract date and time from slotId (format: YYYY-MM-DD-HH:MM)
    const datePart = slotId.substring(0, 10); // YYYY-MM-DD
    const timePart = slotId.substring(11); // HH:MM
    
    const date = new Date(datePart);
    const dayOfWeek = getDay(date);
    const dayKey = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
    
    if (!dayKey) return;
    
    const patternKey = `${dayKey}-${timePart}`;
    
    setPermanentSlotPreferences(prev => {
      const newPrefs = { ...prev };
      // If the pattern key doesn't exist or is true, set it to false (disable)
      // If it's false, set it to true (enable)
      const currentState = newPrefs[patternKey] ?? true; // Default to enabled if not set
      newPrefs[patternKey] = !currentState;
      
      // Notify parent component of changes
      onSlotPreferencesChange?.(newPrefs);
      
      return newPrefs;
    });
  };

  const enableAllSlots = () => {
    // Get all unique pattern keys and enable them permanently
    const allPatternKeys = generatedSlots.reduce((patterns, slot) => {
      const date = new Date(slot.id.substring(0, 10));
      const dayOfWeek = getDay(date);
      const dayKey = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
      if (dayKey) {
        const patternKey = `${dayKey}-${slot.time}`;
        patterns.add(patternKey);
      }
      return patterns;
    }, new Set<string>());

    const newPrefs = Object.fromEntries(Array.from(allPatternKeys).map(key => [key, true]));
    setPermanentSlotPreferences(newPrefs);
    onSlotPreferencesChange?.(newPrefs);
    setManuallyDisabledSlots(new Set());
  };

  const disableAllSlots = () => {
    // Get all unique pattern keys and disable them permanently
    const allPatternKeys = generatedSlots.reduce((patterns, slot) => {
      const date = new Date(slot.id.substring(0, 10));
      const dayOfWeek = getDay(date);
      const dayKey = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
      if (dayKey) {
        const patternKey = `${dayKey}-${slot.time}`;
        patterns.add(patternKey);
      }
      return patterns;
    }, new Set<string>());

    const newPrefs = Object.fromEntries(Array.from(allPatternKeys).map(key => [key, false]));
    setPermanentSlotPreferences(newPrefs);
    onSlotPreferencesChange?.(newPrefs);
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