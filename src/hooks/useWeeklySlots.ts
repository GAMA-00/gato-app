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

  const fetchWeeklySlots = useCallback(async () => {
    if (!providerId || !listingId || !serviceDuration) {
      console.warn('❌ Missing required params:', { providerId, listingId, serviceDuration });
      return;
    }

    // Create params signature to avoid duplicate requests
    const paramsSignature = `${providerId}-${listingId}-${serviceDuration}-${recurrence}-${startDate?.getTime()}-${daysAhead}`;
    if (lastParamsRef.current === paramsSignature) {
      console.log('🔄 Skipping duplicate request');
      return;
    }
    lastParamsRef.current = paramsSignature;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    console.log(`🔄 Fetching slots for provider: ${providerId}, listing: ${listingId}`);
    
    try {
      const baseDate = startDate || startOfDay(new Date());
      const endDate = addDays(baseDate, daysAhead);
      
      console.log('🔍 Date range:', {
        from: format(baseDate, 'yyyy-MM-dd'),
        to: format(endDate, 'yyyy-MM-dd'),
        recurrence
      });

      // Fetch available time slots for this specific listing with correct timezone
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

      if (slotsError) {
        console.error('❌ Error fetching time slots:', slotsError);
        throw slotsError;
      }

      console.log('⏰ Time slots found:', timeSlots?.length || 0);

      // If no slots found, try to regenerate them
      if (!timeSlots || timeSlots.length === 0) {
        console.log('🔧 No slots found, attempting to regenerate...');
        
        try {
          const { data: regenerateResult, error: regenerateError } = await supabase
            .rpc('regenerate_slots_for_listing', { p_listing_id: listingId });
            
          if (regenerateError) {
            console.error('❌ Error regenerating slots:', regenerateError);
          } else {
            console.log('✅ Regenerated slots:', regenerateResult);
            
            // Fetch again after regeneration
            const { data: newTimeSlots, error: newSlotsError } = await supabase
              .from('provider_time_slots')
              .select('*')
              .eq('provider_id', providerId)
              .eq('listing_id', listingId)
              .eq('is_available', true)
              .eq('is_reserved', false)
              .gte('slot_date', format(baseDate, 'yyyy-MM-dd'))
              .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
              .order('slot_datetime_start');
              
            if (!newSlotsError && newTimeSlots && newTimeSlots.length > 0) {
              // Replace timeSlots with new data
              timeSlots.splice(0, timeSlots.length, ...newTimeSlots);
              console.log('📅 After regeneration, found:', newTimeSlots.length, 'slots');
            }
          }
        } catch (regError) {
          console.warn('⚠️ Could not regenerate slots:', regError);
        }
      }

      // Fetch conflicting appointments for basic conflict detection
      const { data: conflictingAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('provider_id', providerId)
        .in('status', ['confirmed', 'pending'])
        .gte('start_time', baseDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (appointmentsError) {
        console.error('❌ Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      console.log('📅 Conflicting appointments:', conflictingAppointments?.length || 0);

      // Convert time slots to weekly slots format with proper timezone handling
      const weeklySlots: WeeklySlot[] = timeSlots?.map(slot => {
        // Create the slot date using the slot_date and start_time (local time)
        const slotDateStr = slot.slot_date;
        const startTimeStr = slot.start_time;
        
        // Parse the local date and time correctly
        const [year, month, day] = slotDateStr.split('-').map(Number);
        const [hours, minutes] = startTimeStr.split(':').map(Number);
        
        // Create date in local timezone (Costa Rica)
        const slotDate = new Date(year, month - 1, day, hours, minutes);
        
        // Check for direct conflicts with existing appointments
        const hasDirectConflict = conflictingAppointments?.some(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          const slotStart = new Date(slot.slot_datetime_start);
          const slotEnd = new Date(slot.slot_datetime_end);
          
          return slotStart < aptEnd && slotEnd > aptStart;
        }) || false;

        const isAvailable = !hasDirectConflict;
        const { time: displayTime, period } = formatTimeTo12Hour(startTimeStr);

        return {
          id: slot.id,
          date: slotDate,
          time: startTimeStr,
          displayTime,
          period,
          isAvailable,
          conflictReason: hasDirectConflict ? 'Horario ocupado' : undefined
        };
      }) || [];

      console.log('🎯 Weekly slots processed:', {
        total: weeklySlots.length,
        available: weeklySlots.filter(s => s.isAvailable).length,
        unavailable: weeklySlots.filter(s => !s.isAvailable).length
      });
      
      setSlots(weeklySlots);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('❌ Error in fetchWeeklySlots:', err);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, listingId, serviceDuration, recurrence, startDate, daysAhead]);

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

  // Single effect for all parameter changes with debounce
  useEffect(() => {
    if (providerId && listingId && serviceDuration > 0) {
      const timer = setTimeout(() => {
        fetchWeeklySlots();
      }, 150); // Small debounce to avoid rapid calls
      
      return () => clearTimeout(timer);
    }
  }, [providerId, listingId, serviceDuration, recurrence, startDate, daysAhead, fetchWeeklySlots]);

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