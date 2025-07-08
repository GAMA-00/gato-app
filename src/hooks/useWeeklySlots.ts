import { useState, useEffect, useMemo, useCallback } from 'react';
import { addDays, format, startOfDay, addWeeks, addMonths } from 'date-fns';
import { validateBookingSlot } from '@/utils/bookingValidation';
import { supabase } from '@/integrations/supabase/client';

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

// Move outside hook to prevent re-renders
const generateTimeSlots = (serviceDuration: number): string[] => {
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

  const fetchWeeklySlots = useCallback(async () => {
    if (!providerId) {
      console.warn('❌ No providerId provided to fetchWeeklySlots');
      return;
    }

    setIsLoading(true);
    console.log(`🔄 Starting fetchWeeklySlots for provider: ${providerId}`);
    
    try {
      const baseDate = startDate || startOfDay(new Date());
      const timeSlots = generateTimeSlots(serviceDuration);
      
      // PHASE 1: Get all conflicts for the date range - FIXED SQL AMBIGUITY
      const endDate = addDays(baseDate, daysAhead);
      console.log(`🔍 Fetching conflicts for provider ${providerId} from ${format(baseDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
      
      const [appointmentsResult, blockedSlotsResult, recurringRulesResult] = await Promise.all([
        // Get all appointments in the date range - FIXED: Use explicit column names
        supabase
          .from('appointments')
          .select('start_time, end_time, status, recurrence, is_recurring_instance')
          .eq('provider_id', providerId)
          .in('status', ['pending', 'confirmed', 'completed', 'scheduled'])
          .gte('start_time', baseDate.toISOString())
          .lte('start_time', endDate.toISOString()),
        
        // Get all blocked time slots for this provider - FIXED: Use explicit column names
        supabase
          .from('blocked_time_slots')
          .select('day, start_hour, end_hour')
          .eq('provider_id', providerId),
        
        // Get active recurring rules to generate instances - FIXED: Use explicit column names
        supabase
          .from('recurring_rules')
          .select('id, provider_id, recurrence_type, start_date, start_time, end_time, day_of_week, day_of_month, is_active')
          .eq('provider_id', providerId)
          .eq('is_active', true)
      ]);

      // Handle errors gracefully
      if (appointmentsResult.error) {
        console.error('❌ Error fetching appointments:', appointmentsResult.error);
      }
      if (blockedSlotsResult.error) {
        console.error('❌ Error fetching blocked slots:', blockedSlotsResult.error);
      }
      if (recurringRulesResult.error) {
        console.error('❌ Error fetching recurring rules:', recurringRulesResult.error);
      }

      const appointments = appointmentsResult.data || [];
      const blockedSlots = blockedSlotsResult.data || [];
      const recurringRules = recurringRulesResult.data || [];
      
      // PHASE 1.5: Generate recurring instances for the date range - SIMPLIFIED
      const recurringInstances: any[] = [];
      
      // Only generate instances if we have rules and it's reasonable
      if (recurringRules.length > 0 && recurringRules.length < 10) {
        console.log(`📅 Generating recurring instances for ${recurringRules.length} rules`);
        
        recurringRules.forEach((rule, ruleIndex) => {
          try {
            let currentDate = new Date(Math.max(new Date(rule.start_date).getTime(), baseDate.getTime()));
            const maxDate = endDate;
            let instanceCount = 0;
            const maxInstances = 20; // Reduced safety limit
            
            while (currentDate <= maxDate && instanceCount < maxInstances) {
              let nextOccurrence: Date | null = null;
              
              switch (rule.recurrence_type) {
                case 'weekly':
                  nextOccurrence = findNextWeeklyOccurrence(currentDate, rule.day_of_week);
                  break;
                case 'biweekly':
                  nextOccurrence = findNextBiweeklyOccurrence(currentDate, rule.day_of_week, new Date(rule.start_date));
                  break;
                case 'monthly':
                  nextOccurrence = findNextMonthlyOccurrence(currentDate, rule.day_of_month);
                  break;
              }
              
              if (!nextOccurrence || nextOccurrence > maxDate) {
                break;
              }
              
              // Create instance datetime with error handling
              try {
                const [startHours, startMinutes] = rule.start_time.split(':').map(Number);
                const [endHours, endMinutes] = rule.end_time.split(':').map(Number);
                
                const instanceStart = new Date(nextOccurrence);
                instanceStart.setHours(startHours, startMinutes, 0, 0);
                
                const instanceEnd = new Date(nextOccurrence);
                instanceEnd.setHours(endHours, endMinutes, 0, 0);
                
                if (instanceStart >= baseDate && instanceStart <= endDate) {
                  recurringInstances.push({
                    start_time: instanceStart.toISOString(),
                    end_time: instanceEnd.toISOString(),
                    status: 'confirmed',
                    is_recurring_instance: true
                  });
                }
              } catch (timeError) {
                console.warn(`⚠️ Error parsing time for rule ${ruleIndex}:`, timeError);
              }
              
              // Move to next occurrence
              switch (rule.recurrence_type) {
                case 'weekly':
                  currentDate = new Date(nextOccurrence);
                  currentDate.setDate(currentDate.getDate() + 7);
                  break;
                case 'biweekly':
                  currentDate = new Date(nextOccurrence);
                  currentDate.setDate(currentDate.getDate() + 14);
                  break;
                case 'monthly':
                  currentDate = new Date(nextOccurrence);
                  currentDate.setMonth(currentDate.getMonth() + 1);
                  break;
              }
              
              instanceCount++;
            }
          } catch (ruleError) {
            console.warn(`⚠️ Error processing recurring rule ${ruleIndex}:`, ruleError);
          }
        });
      }
      
      // Combine regular appointments with recurring instances
      const allAppointments = [...appointments, ...recurringInstances];
      
      console.log(`📊 Found ${appointments.length} appointments, ${blockedSlots.length} blocked slots, ${recurringInstances.length} recurring instances`);

      // PHASE 2: Generate and filter slots with batch validation
      const newSlots: WeeklySlot[] = [];
      let totalGenerated = 0;
      let totalFiltered = 0;

      for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
        const currentDate = addDays(baseDate, dayOffset);
        const dayOfWeek = currentDate.getDay();
        
        // Get blocked slots for this day
        const dayBlockedSlots = blockedSlots.filter(slot => 
          slot.day === dayOfWeek || slot.day === -1
        );
        
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

          totalGenerated++;
          
          // CHECK 1: Is this slot blocked by provider?
          const isBlocked = dayBlockedSlots.some(blocked => {
            const slotStartMinutes = hours * 60 + minutes;
            const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
            const blockedStartMinutes = blocked.start_hour * 60;
            const blockedEndMinutes = blocked.end_hour * 60;
            
            return slotStartMinutes < blockedEndMinutes && slotEndMinutes > blockedStartMinutes;
          });

          if (isBlocked) {
            console.log(`🚫 Slot ${timeSlot} on ${format(currentDate, 'yyyy-MM-dd')} is blocked by provider`);
            totalFiltered++;
            continue; // Don't add blocked slots to the list
          }

          // CHECK 2: Does this slot overlap with existing appointments (including recurring)?
          const hasAppointmentConflict = allAppointments.some(appointment => {
            const appointmentStart = new Date(appointment.start_time);
            const appointmentEnd = new Date(appointment.end_time);
            
            // Check if times overlap: startTime < appointmentEnd && endTime > appointmentStart
            return slotStart < appointmentEnd && slotEnd > appointmentStart;
          });

          if (hasAppointmentConflict) {
            console.log(`⏰ Slot ${timeSlot} on ${format(currentDate, 'yyyy-MM-dd')} conflicts with existing appointment`);
            totalFiltered++;
            continue; // Don't add conflicted slots to the list
          }

          // If we get here, the slot is truly available
          const { time: displayTime, period } = formatTimeTo12Hour(timeSlot);
          const slotId = `${format(currentDate, 'yyyy-MM-dd')}-${timeSlot}`;

          newSlots.push({
            id: slotId,
            date: currentDate,
            time: timeSlot,
            displayTime,
            period,
            isAvailable: true // Only available slots make it to this point
          });
        }
      }

      console.log(`✅ Slot generation complete: ${totalGenerated} generated, ${totalFiltered} filtered, ${newSlots.length} available`);
      setSlots(newSlots);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Critical error in fetchWeeklySlots:', error);
      // Don't leave users hanging - set empty slots and show we tried
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, serviceDuration, startDate, daysAhead, recurrence]);

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
    if (providerId && serviceDuration) {
      fetchWeeklySlots();
    }
  }, [fetchWeeklySlots]);

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