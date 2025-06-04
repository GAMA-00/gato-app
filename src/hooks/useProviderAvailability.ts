
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, addDays } from 'date-fns';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface UseProviderAvailabilityProps {
  providerId: string;
  selectedDate: Date;
  serviceDuration: number;
  recurrence?: string;
}

export const useProviderAvailability = ({
  providerId,
  selectedDate,
  serviceDuration,
  recurrence = 'once'
}: UseProviderAvailabilityProps) => {
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!providerId || !selectedDate) return;

      setIsLoading(true);
      
      try {
        console.log(`Checking availability for provider ${providerId} on ${format(selectedDate, 'yyyy-MM-dd')}`);
        
        // Generate time slots from 7 AM to 7 PM every 30 minutes
        const timeSlots: TimeSlot[] = [];
        for (let hour = 7; hour < 19; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            timeSlots.push({
              time: timeString,
              available: true
            });
          }
        }

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Fetch all regular appointments for this provider on the selected date
        console.log('Fetching regular appointments...');
        const { data: regularAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('start_time, end_time, status')
          .eq('provider_id', providerId)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .in('status', ['pending', 'confirmed', 'completed']);

        if (appointmentsError) {
          console.error('Error fetching regular appointments:', appointmentsError);
        }

        // 2. Fetch recurring instances for this provider on the selected date
        console.log('Fetching recurring instances...');
        const { data: recurringInstances, error: recurringError } = await supabase
          .from('recurring_instances')
          .select(`
            start_time, 
            end_time, 
            status,
            recurring_rules!inner(provider_id)
          `)
          .eq('recurring_rules.provider_id', providerId)
          .eq('instance_date', format(selectedDate, 'yyyy-MM-dd'))
          .in('status', ['scheduled', 'confirmed', 'completed']);

        if (recurringError) {
          console.error('Error fetching recurring instances:', recurringError);
        }

        // 3. Fetch blocked time slots for the specific day
        const dayOfWeek = selectedDate.getDay();
        console.log('Fetching blocked time slots for day:', dayOfWeek);
        const { data: blockedSlots, error: blockedError } = await supabase
          .from('blocked_time_slots')
          .select('start_hour, end_hour, day')
          .eq('provider_id', providerId)
          .or(`day.eq.${dayOfWeek},day.eq.-1`); // Include daily blocks (-1) and specific day blocks

        if (blockedError) {
          console.error('Error fetching blocked slots:', blockedError);
        }

        console.log('Blocked slots found:', blockedSlots);

        // 4. If recurrence is selected, check for conflicts in future dates
        let futureConflicts: any[] = [];
        if (recurrence !== 'once') {
          console.log(`Checking future conflicts for ${recurrence} recurrence...`);
          
          const futureDates = [];
          let checkDate = new Date(selectedDate);
          
          // Check next 8 occurrences for conflicts
          for (let i = 0; i < 8; i++) {
            if (recurrence === 'weekly') {
              checkDate = addWeeks(checkDate, 1);
            } else if (recurrence === 'biweekly') {
              checkDate = addWeeks(checkDate, 2);
            } else if (recurrence === 'monthly') {
              checkDate = addDays(checkDate, 30); // Approximate monthly
            }
            futureDates.push(new Date(checkDate));
          }

          // Check for conflicts on future dates
          for (const futureDate of futureDates) {
            const futureStartOfDay = new Date(futureDate);
            futureStartOfDay.setHours(0, 0, 0, 0);
            
            const futureEndOfDay = new Date(futureDate);
            futureEndOfDay.setHours(23, 59, 59, 999);

            // Check regular appointments
            const { data: futureAppointments } = await supabase
              .from('appointments')
              .select('start_time, end_time')
              .eq('provider_id', providerId)
              .gte('start_time', futureStartOfDay.toISOString())
              .lte('start_time', futureEndOfDay.toISOString())
              .in('status', ['pending', 'confirmed', 'completed']);

            if (futureAppointments) {
              futureConflicts.push(...futureAppointments);
            }

            // Check future recurring instances
            const { data: futureRecurring } = await supabase
              .from('recurring_instances')
              .select(`
                start_time, 
                end_time,
                recurring_rules!inner(provider_id)
              `)
              .eq('recurring_rules.provider_id', providerId)
              .eq('instance_date', format(futureDate, 'yyyy-MM-dd'))
              .in('status', ['scheduled', 'confirmed', 'completed']);

            if (futureRecurring) {
              futureConflicts.push(...futureRecurring);
            }
          }
        }

        // Combine all conflicting appointments
        const allConflicts = [
          ...(regularAppointments || []),
          ...(recurringInstances || []),
          ...futureConflicts
        ];

        console.log(`Found ${allConflicts.length} conflicting appointments`);
        console.log(`Found ${blockedSlots?.length || 0} blocked time slots`);

        // Filter available slots based on conflicts and blocked times
        const availableSlots = timeSlots.filter(slot => {
          const [slotHour, slotMinute] = slot.time.split(':').map(Number);
          const slotStart = new Date(selectedDate);
          slotStart.setHours(slotHour, slotMinute, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

          // Check if this slot conflicts with any existing appointments
          const hasAppointmentConflict = allConflicts.some(conflict => {
            const conflictStart = new Date(conflict.start_time);
            const conflictEnd = new Date(conflict.end_time);
            
            // Check for any overlap: slot starts before conflict ends AND slot ends after conflict starts
            return (slotStart < conflictEnd && slotEnd > conflictStart);
          });

          // Check if this slot conflicts with blocked time
          const hasBlockedConflict = blockedSlots?.some(blocked => {
            // Check if the slot overlaps with any blocked period
            const slotStartHour = slotHour + (slotMinute / 60);
            const slotEndHour = slotStartHour + (serviceDuration / 60);
            
            console.log(`Checking slot ${slot.time} (${slotStartHour}-${slotEndHour}) against blocked ${blocked.start_hour}-${blocked.end_hour}`);
            
            // A slot is blocked if it overlaps with any blocked period
            return (slotStartHour < blocked.end_hour && slotEndHour > blocked.start_hour);
          });

          // Additional check for recurring conflicts if this is a recurring booking
          let hasRecurringConflict = false;
          if (recurrence !== 'once' && futureConflicts.length > 0) {
            hasRecurringConflict = futureConflicts.some(conflict => {
              const conflictStart = new Date(conflict.start_time);
              const conflictEnd = new Date(conflict.end_time);
              
              // Check if the time (ignoring date) conflicts with any future appointment
              const conflictTimeStart = conflictStart.getHours() * 60 + conflictStart.getMinutes();
              const conflictTimeEnd = conflictEnd.getHours() * 60 + conflictEnd.getMinutes();
              const slotTimeStart = slotHour * 60 + slotMinute;
              const slotTimeEnd = slotTimeStart + serviceDuration;
              
              return (slotTimeStart < conflictTimeEnd && slotTimeEnd > conflictTimeStart);
            });
          }

          const isAvailable = !hasAppointmentConflict && !hasBlockedConflict && !hasRecurringConflict;
          
          if (!isAvailable) {
            console.log(`Slot ${slot.time} is unavailable - Appointment conflict: ${hasAppointmentConflict}, Blocked: ${hasBlockedConflict}, Recurring conflict: ${hasRecurringConflict}`);
          }

          return isAvailable;
        });

        setAvailableTimeSlots(availableSlots);
        console.log(`Generated ${availableSlots.length} available slots out of ${timeSlots.length} total slots`);
        
      } catch (error) {
        console.error('Error checking availability:', error);
        setAvailableTimeSlots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [providerId, selectedDate, serviceDuration, recurrence]);

  return {
    availableTimeSlots,
    isLoading
  };
};
