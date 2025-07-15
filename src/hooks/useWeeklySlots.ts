import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeTo12Hour } from '@/utils/timeSlotUtils';

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
  listingId: string;
  serviceDuration: number;
  recurrence?: string;
  startDate?: Date;
  daysAhead?: number;
}

export const useWeeklySlots = ({
  providerId,
  listingId,
  serviceDuration,
  recurrence = 'once',
  startDate,
  daysAhead = 7
}: UseWeeklySlotsProps) => {
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingSlot, setIsValidatingSlot] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Stable cache for request deduplication
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<string>('');

  // Stable function to fetch slots - only recreated when essential params change
  const fetchWeeklySlots = useCallback(async () => {
    if (!providerId || !listingId || !serviceDuration) {
      return;
    }

    // Create stable params signature
    const baseDate = startDate || startOfDay(new Date());
    const endDate = addDays(baseDate, daysAhead);
    const paramsSignature = `${providerId}-${listingId}-${serviceDuration}-${recurrence}-${format(baseDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
    
    if (lastParamsRef.current === paramsSignature) {
      return;
    }
    lastParamsRef.current = paramsSignature;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    
    try {
      // Fetch available time slots
      const { data: timeSlots, error: slotsError } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', providerId)
        .eq('listing_id', listingId)
        .eq('is_available', true)
        .eq('is_reserved', false)
        .gte('slot_date', format(baseDate, 'yyyy-MM-dd'))
        .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
        .order('slot_datetime_start');

      if (slotsError) throw slotsError;

      // Fetch conflicting appointments
      const { data: conflictingAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('provider_id', providerId)
        .in('status', ['confirmed', 'pending'])
        .gte('start_time', baseDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (appointmentsError) throw appointmentsError;

      // Process slots with proper timezone handling
      const weeklySlots: WeeklySlot[] = timeSlots?.map(slot => {
        const [year, month, day] = slot.slot_date.split('-').map(Number);
        const [hours, minutes] = slot.start_time.split(':').map(Number);
        const slotDate = new Date(year, month - 1, day, hours, minutes);
        
        // Check conflicts
        const hasDirectConflict = conflictingAppointments?.some(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          const slotStart = new Date(slot.slot_datetime_start);
          const slotEnd = new Date(slot.slot_datetime_end);
          return slotStart < aptEnd && slotEnd > aptStart;
        }) || false;

        const { time: displayTime, period } = formatTimeTo12Hour(slot.start_time);

        return {
          id: slot.id,
          date: slotDate,
          time: slot.start_time,
          displayTime,
          period,
          isAvailable: !hasDirectConflict,
          conflictReason: hasDirectConflict ? 'Horario ocupado' : undefined
        };
      }) || [];
      
      setSlots(weeklySlots);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching slots:', err);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, listingId, serviceDuration, recurrence]); // Removed unstable dependencies

  // Validate a specific slot for recurring conflicts only when needed
  const validateSlot = async (slot: WeeklySlot): Promise<boolean> => {
    if (!providerId || recurrence === 'once') return true;

    setIsValidatingSlot(true);
    try {
      const [hours, minutes] = slot.time.split(':').map(Number);
      const slotStart = new Date(slot.date);
      slotStart.setHours(hours, minutes, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

      // Simple recurring conflict check using the database function
      const { data: isAvailable, error } = await supabase
        .rpc('check_recurring_availability', {
          p_provider_id: providerId,
          p_start_time: slotStart.toISOString(),
          p_end_time: slotEnd.toISOString()
        });

      if (error) {
        console.error('Error checking recurring availability:', error);
        return false;
      }

      const isValid = Boolean(isAvailable);

      // Update slot availability if validation fails
      if (!isValid) {
        setSlots(prev => prev.map(s => 
          s.id === slot.id 
            ? { ...s, isAvailable: false, conflictReason: 'Conflicto con horario recurrente' }
            : s
        ));
      }

      return isValid;
    } catch (error) {
      console.error('Error validating slot:', error);
      return false;
    } finally {
      setIsValidatingSlot(false);
    }
  };

  // Create a stable refresh function
  const refreshSlots = useCallback(() => {
    lastParamsRef.current = ''; // Clear cache to force refresh
    fetchWeeklySlots();
  }, [fetchWeeklySlots]);

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

  // Effect to trigger fetch when essential params change
  useEffect(() => {
    if (providerId && listingId && serviceDuration > 0) {
      const timer = setTimeout(fetchWeeklySlots, 100);
      return () => clearTimeout(timer);
    }
  }, [providerId, listingId, serviceDuration, recurrence, startDate?.getTime(), daysAhead, fetchWeeklySlots]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    slotGroups,
    availableSlotGroups,
    stats,
    isLoading,
    isValidatingSlot,
    lastUpdated,
    validateSlot,
    refreshSlots
  };
};