import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { addDays, format, startOfDay, addWeeks, addMonths } from 'date-fns';
import { validateBookingSlot } from '@/utils/bookingValidation';
import { supabase } from '@/integrations/supabase/client';
import { generateTimeSlots, formatTimeTo12Hour, createSlotId, checkTimeOverlap } from '@/utils/timeSlotUtils';

// Helper functions for recurring instances
function findNextWeeklyOccurrence(currentDate: Date, dayOfWeek: number): Date {
  const result = new Date(currentDate);
  const currentDay = result.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
  
  if (daysUntilTarget === 0 && result.getTime() === currentDate.getTime()) {
    return result;
  }
  
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

function findNextBiweeklyOccurrence(currentDate: Date, dayOfWeek: number, startDate: Date): Date {
  let candidate = findNextWeeklyOccurrence(currentDate, dayOfWeek);
  
  while (candidate <= currentDate) {
    candidate = addWeeks(candidate, 1);
  }
  
  while (true) {
    const daysDiff = Math.floor((candidate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 0 && daysDiff % 14 === 0) {
      break;
    }
    candidate = addWeeks(candidate, 1);
  }
  
  return candidate;
}

function findNextMonthlyOccurrence(currentDate: Date, dayOfMonth: number): Date {
  const result = new Date(currentDate);
  result.setDate(dayOfMonth);
  
  if (result <= currentDate) {
    result.setMonth(result.getMonth() + 1);
    result.setDate(dayOfMonth);
  }
  
  return result;
}

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
  listingId: string; // Añadir listingId
  serviceDuration: number;
  recurrence?: string;
  startDate?: Date;
  daysAhead?: number;
}

export const useWeeklySlots = ({
  providerId,
  listingId, // Añadir listingId
  serviceDuration,
  recurrence = 'once',
  startDate,
  daysAhead = 7
}: UseWeeklySlotsProps) => {
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingSlot, setIsValidatingSlot] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Cache and throttling
  const cacheRef = useRef<{ [key: string]: { data: WeeklySlot[], timestamp: number } }>({});
  const lastCallRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchWeeklySlots = useCallback(async () => {
    if (!providerId) {
      console.warn('❌ No providerId provided to fetchWeeklySlots');
      return;
    }

    // Throttling: prevent calls too close together
    const now = Date.now();
    if (now - lastCallRef.current < 500) {
      console.log('🚫 Throttling fetchWeeklySlots call');
      return;
    }
    lastCallRef.current = now;

    // Check cache first
    const cacheKey = `${providerId}-${listingId}-${serviceDuration}-${startDate?.getTime() || 'now'}-${daysAhead}`;
    const cached = cacheRef.current[cacheKey];
    if (cached && now - cached.timestamp < 30000) { // 30 second cache
      console.log('📦 Using cached slots');
      setSlots(cached.data);
      setLastUpdated(new Date(cached.timestamp));
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    console.log(`🔄 Starting fetchWeeklySlots for provider: ${providerId}`);
    
    try {
      const baseDate = startDate || startOfDay(new Date());
      
      // Generate time slots for this service duration
      const timeSlots = generateTimeSlots(serviceDuration);
      
      // PHASE 1: Get all conflicts for the date range with retry logic
      const endDate = addDays(baseDate, daysAhead);
      console.log(`🔍 Fetching conflicts for provider ${providerId} from ${format(baseDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
      
      // Fetch with fallback to showing basic slots on network error
      let appointments: any[] = [];
      let providerTimeSlots: any[] = [];
      
      try {
        // Try appointments first
        const appointmentsResult = await supabase
          .from('appointments')
          .select('start_time, end_time, status, recurrence, is_recurring_instance')
          .eq('provider_id', providerId)
          .in('status', ['pending', 'confirmed', 'completed', 'scheduled'])
          .gte('start_time', baseDate.toISOString())
          .lte('start_time', endDate.toISOString());
          
        if (appointmentsResult.error) {
          console.warn('⚠️ Could not fetch appointments, showing optimistic slots:', appointmentsResult.error);
        } else {
          appointments = appointmentsResult.data || [];
        }

        // Fetch provider time slots for this specific listing and date range
        const slotsResult = await supabase
          .from('provider_time_slots')
          .select('*')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .eq('is_available', true)
          .eq('is_reserved', false)
          .gte('slot_date', format(baseDate, 'yyyy-MM-dd'))
          .lte('slot_date', format(endDate, 'yyyy-MM-dd'));

        if (slotsResult.error) {
          console.warn('⚠️ Could not fetch provider time slots:', slotsResult.error);
        } else {
          providerTimeSlots = slotsResult.data || [];
          console.log(`📅 Found ${providerTimeSlots.length} available slots for listing ${listingId}`);
        }
      } catch (error) {
        console.warn('⚠️ Network error fetching data, showing optimistic slots');
      }
      
      
      console.log(`📊 Found ${appointments.length} appointments, ${providerTimeSlots.length} provider slots for listing ${listingId}`);

      // PHASE 2: Generate slots ONLY from provider_time_slots that match this listing
      const newSlots: WeeklySlot[] = [];
      let totalGenerated = 0;
      let totalFiltered = 0;

      // Process each provider time slot for this listing
      providerTimeSlots.forEach(timeSlot => {
        const slotDate = new Date(timeSlot.slot_date);
        const [hours, minutes] = timeSlot.start_time.split(':').map(Number);
        const slotStart = new Date(slotDate);
        slotStart.setHours(hours, minutes, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

        totalGenerated++;

        // CHECK: Does this slot overlap with existing appointments?
        const hasAppointmentConflict = appointments.some(appointment => {
          const appointmentStart = new Date(appointment.start_time);
          const appointmentEnd = new Date(appointment.end_time);
          
          // Check if times overlap using utility function
          return checkTimeOverlap(slotStart, slotEnd, appointmentStart, appointmentEnd);
        });

        if (hasAppointmentConflict) {
          console.log(`⏰ Slot ${timeSlot.start_time} on ${format(slotDate, 'yyyy-MM-dd')} conflicts with existing appointment`);
          totalFiltered++;
          return; // Skip this slot
        }

        // If we get here, the slot is truly available
        const { time: displayTime, period } = formatTimeTo12Hour(timeSlot.start_time);
        const slotId = createSlotId(slotDate, timeSlot.start_time);

        newSlots.push({
          id: slotId,
          date: slotDate,
          time: timeSlot.start_time,
          displayTime,
          period,
          isAvailable: true // Only available slots make it to this point
        });
      });

      console.log(`✅ Slot generation complete: ${totalGenerated} generated, ${totalFiltered} filtered, ${newSlots.length} available`);
      
      // Cache the results
      cacheRef.current[cacheKey] = {
        data: newSlots,
        timestamp: now
      };
      
      setSlots(newSlots);
      setLastUpdated(new Date());
    } catch (error) {
      if ((error as any)?.name === 'AbortError') return;
      console.error('❌ Critical error in fetchWeeklySlots:', error);
      // Don't leave users hanging - set empty slots and show we tried
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, listingId, serviceDuration, startDate, daysAhead]); // Include listingId in dependencies

  // Validate a specific slot when it's being selected (now just for recurring conflicts)
  const validateSlot = async (slot: WeeklySlot): Promise<boolean> => {
    if (!providerId) return false;

    setIsValidatingSlot(true);
    try {
      const [hours, minutes] = slot.time.split(':').map(Number);
      const slotStart = new Date(slot.date);
      slotStart.setHours(hours, minutes, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

      // Since we pre-filter basic availability, only check recurring conflicts
      const isValid = recurrence === 'once' ? true : await validateBookingSlot(
        providerId,
        slotStart,
        slotEnd,
        recurrence
      );

      // Update slot availability based on validation
      if (!isValid) {
        setSlots(prev => prev.map(s => 
          s.id === slot.id 
            ? { ...s, isAvailable: false }
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
    console.log(`🔄 useEffect triggered for fetchWeeklySlots - Provider: ${providerId}, Duration: ${serviceDuration}`);
    if (providerId && serviceDuration > 0) {
      fetchWeeklySlots();
    }
  }, [fetchWeeklySlots]); // Only depend on the function itself

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