import { useState, useEffect, useMemo } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import { validateBookingSlot } from '@/utils/bookingValidation';

export interface WeeklySlot {
  id: string;
  date: Date;
  time: string;
  displayTime: string;
  period: 'AM' | 'PM';
  isAvailable: boolean;
  conflictReason?: string;
}

export interface WeeklySlotGroup {
  date: Date;
  dayName: string;
  dayNumber: number;
  dayMonth: string;
  slots: WeeklySlot[];
}

interface UseWeeklySlotsProps {
  providerId: string;
  serviceDuration: number;
  recurrence?: string;
  startDate?: Date;
  daysAhead?: number;
}

export const useWeeklySlots = ({
  providerId,
  serviceDuration,
  recurrence = 'once',
  startDate,
  daysAhead = 7
}: UseWeeklySlotsProps) => {
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingSlot, setIsValidatingSlot] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const formatTimeTo12Hour = (time24: string): { time: string; period: 'AM' | 'PM' } => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return {
      time: `${hours12}:${minutes.toString().padStart(2, '0')}`,
      period
    };
  };

  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    // Generate slots from 7 AM to 7 PM
    for (let hour = 7; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += serviceDuration) {
        // Make sure we don't exceed 7 PM
        if (hour === 18 && minute > 0) break;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const fetchWeeklySlots = async () => {
    if (!providerId) return;

    setIsLoading(true);
    try {
      const baseDate = startDate || startOfDay(new Date());
      const timeSlots = generateTimeSlots();
      const newSlots: WeeklySlot[] = [];

      for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
        const currentDate = addDays(baseDate, dayOffset);
        
        for (const timeSlot of timeSlots) {
          const [hours, minutes] = timeSlot.split(':').map(Number);
          const slotStart = new Date(currentDate);
          slotStart.setHours(hours, minutes, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

          // Skip if slot would end after 7 PM
          if (slotEnd.getHours() >= 19) {
            continue;
          }

          const { time: displayTime, period } = formatTimeTo12Hour(timeSlot);
          const slotId = `${format(currentDate, 'yyyy-MM-dd')}-${timeSlot}`;

          // For now, set all slots as available - we'll validate them individually when needed
          newSlots.push({
            id: slotId,
            date: currentDate,
            time: timeSlot,
            displayTime,
            period,
            isAvailable: true
          });
        }
      }

      setSlots(newSlots);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching weekly slots:', error);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate a specific slot when it's being selected
  const validateSlot = async (slot: WeeklySlot): Promise<boolean> => {
    if (!providerId) return false;

    setIsValidatingSlot(true);
    try {
      const [hours, minutes] = slot.time.split(':').map(Number);
      const slotStart = new Date(slot.date);
      slotStart.setHours(hours, minutes, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

      const isValid = await validateBookingSlot(
        providerId,
        slotStart,
        slotEnd,
        recurrence
      );

      // Update slot availability based on validation
      setSlots(prev => prev.map(s => 
        s.id === slot.id 
          ? { ...s, isAvailable: isValid }
          : s
      ));

      return isValid;
    } catch (error) {
      console.error('Error validating slot:', error);
      return false;
    } finally {
      setIsValidatingSlot(false);
    }
  };

  // Group slots by date for easier rendering
  const slotGroups = useMemo((): WeeklySlotGroup[] => {
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
  }, [slots]);

  // Filter to show only days with available slots
  const availableSlotGroups = useMemo(() => {
    return slotGroups.filter(group => 
      group.slots.some(slot => slot.isAvailable)
    );
  }, [slotGroups]);

  const stats = useMemo(() => {
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
  }, [slots, slotGroups, availableSlotGroups]);

  useEffect(() => {
    fetchWeeklySlots();
  }, [providerId, serviceDuration, recurrence, startDate, daysAhead]);

  return {
    slotGroups,
    availableSlotGroups,
    stats,
    isLoading,
    isValidatingSlot,
    lastUpdated,
    validateSlot,
    refreshSlots: fetchWeeklySlots
  };
};