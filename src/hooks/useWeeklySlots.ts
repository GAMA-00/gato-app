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
    if (!providerId || !listingId || !serviceDuration) {
      console.warn('❌ Missing required params:', { providerId, listingId, serviceDuration });
      return;
    }

    setIsLoading(true);
    console.log(`🔄 Starting fetchWeeklySlots for provider: ${providerId}, listing: ${listingId}`);
    
    try {
      const baseDate = startDate || startOfDay(new Date());
      const endDate = addDays(baseDate, daysAhead);
      
      console.log('🔍 Fetching slots with params:', {
        providerId,
        listingId,
        serviceDuration,
        recurrence,
        dateRange: `${format(baseDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`
      });

      // Fetch available time slots for this specific listing
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

      console.log('⏰ Available time slots found:', timeSlots?.length || 0);

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
              
            if (!newSlotsError && newTimeSlots) {
              timeSlots.push(...newTimeSlots);
              console.log('📅 After regeneration, found:', newTimeSlots.length, 'slots');
            }
          }
        } catch (regError) {
          console.warn('⚠️ Could not regenerate slots:', regError);
        }
      }

      // Fetch conflicting appointments
      const { data: conflictingAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_time, end_time, recurrence, status')
        .eq('provider_id', providerId)
        .in('status', ['confirmed', 'pending'])
        .gte('start_time', baseDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (appointmentsError) {
        console.error('❌ Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      console.log('📅 Conflicting appointments:', conflictingAppointments?.length || 0);

      // Fetch existing recurring rules for conflict detection
      const { data: recurringRules, error: rulesError } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (rulesError) {
        console.error('❌ Error fetching recurring rules:', rulesError);
      }

      // Convert time slots to weekly slots format with enhanced conflict detection
      const weeklySlots: WeeklySlot[] = timeSlots?.map(slot => {
        const slotDate = new Date(slot.slot_datetime_start);
        
        // Check for direct conflicts with existing appointments
        const hasDirectConflict = conflictingAppointments?.some(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          const slotStart = new Date(slot.slot_datetime_start);
          const slotEnd = new Date(slot.slot_datetime_end);
          
          return slotStart < aptEnd && slotEnd > aptStart;
        }) || false;

        // Enhanced recurring conflict detection
        let hasRecurringConflict = false;
        if (recurrence && recurrence !== 'once') {
          // Check conflicts with recurring rules
          hasRecurringConflict = recurringRules?.some(rule => {
            const ruleStart = new Date(`2000-01-01T${rule.start_time}`);
            const ruleEnd = new Date(`2000-01-01T${rule.end_time}`);
            const slotTime = new Date(`2000-01-01T${format(slotDate, 'HH:mm:ss')}`);
            const slotEndTime = new Date(slotTime.getTime() + serviceDuration * 60000);
            
            // Check time overlap
            const hasTimeOverlap = slotTime < ruleEnd && slotEndTime > ruleStart;
            
            if (!hasTimeOverlap) return false;
            
            // Check recurrence pattern conflicts
            switch (recurrence) {
              case 'weekly':
                return rule.recurrence_type === 'weekly' && 
                       rule.day_of_week === slotDate.getDay();
              
              case 'biweekly':
                if (rule.recurrence_type === 'biweekly') {
                  const ruleStartDate = new Date(rule.start_date);
                  const weeksDiff = Math.floor((slotDate.getTime() - ruleStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
                  return weeksDiff % 2 === 0 && rule.day_of_week === slotDate.getDay();
                }
                return rule.recurrence_type === 'weekly' && rule.day_of_week === slotDate.getDay();
              
              case 'monthly':
                return rule.recurrence_type === 'monthly' && 
                       rule.day_of_month === slotDate.getDate();
              
              default:
                return false;
            }
          }) || false;

          // Also check conflicts with existing recurring appointments
          hasRecurringConflict = hasRecurringConflict || conflictingAppointments?.some(apt => {
            if (!apt.recurrence || apt.recurrence === 'once') return false;
            
            const aptStart = new Date(apt.start_time);
            const slotStart = new Date(slot.slot_datetime_start);
            
            const hasTimeMatch = aptStart.getHours() === slotStart.getHours() &&
                                 aptStart.getMinutes() === slotStart.getMinutes();
            
            if (!hasTimeMatch) return false;
            
            switch (recurrence) {
              case 'weekly':
                return apt.recurrence === 'weekly' && aptStart.getDay() === slotStart.getDay();
              
              case 'biweekly':
                if (apt.recurrence === 'biweekly') {
                  const weeksDiff = Math.floor((slotStart.getTime() - aptStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
                  return weeksDiff % 2 === 0 && aptStart.getDay() === slotStart.getDay();
                }
                return apt.recurrence === 'weekly' && aptStart.getDay() === slotStart.getDay();
              
              case 'monthly':
                return apt.recurrence === 'monthly' && aptStart.getDate() === slotStart.getDate();
              
              default:
                return false;
            }
          }) || false;
        }

        const isAvailable = !hasDirectConflict && !hasRecurringConflict;
        const { time: displayTime, period } = formatTimeTo12Hour(format(slotDate, 'HH:mm'));

        return {
          id: slot.id,
          date: slotDate,
          time: format(slotDate, 'HH:mm'),
          displayTime,
          period,
          isAvailable
        };
      }) || [];

      console.log('🎯 Final weekly slots processed:', {
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
  }, [providerId, listingId, serviceDuration, recurrence, startDate, daysAhead])

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