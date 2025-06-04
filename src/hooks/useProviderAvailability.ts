
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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

        // Check for existing appointments on this date
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('start_time, end_time')
          .eq('provider_id', providerId)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .in('status', ['pending', 'confirmed']);

        if (error) {
          console.error('Error fetching appointments:', error);
          setAvailableTimeSlots(timeSlots);
          return;
        }

        // Check for blocked time slots
        const dayOfWeek = selectedDate.getDay();
        const { data: blockedSlots, error: blockedError } = await supabase
          .from('blocked_time_slots')
          .select('start_hour, end_hour')
          .eq('provider_id', providerId)
          .eq('day', dayOfWeek);

        if (blockedError) {
          console.error('Error fetching blocked slots:', error);
        }

        // Mark unavailable slots
        const updatedSlots = timeSlots.map(slot => {
          const [slotHour, slotMinute] = slot.time.split(':').map(Number);
          const slotStart = new Date(selectedDate);
          slotStart.setHours(slotHour, slotMinute, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

          // Check if this slot conflicts with existing appointments
          const hasAppointmentConflict = appointments?.some(apt => {
            const aptStart = new Date(apt.start_time);
            const aptEnd = new Date(apt.end_time);
            
            return (slotStart < aptEnd && slotEnd > aptStart);
          });

          // Check if this slot conflicts with blocked time
          const hasBlockedConflict = blockedSlots?.some(blocked => {
            return slotHour >= blocked.start_hour && slotHour < blocked.end_hour;
          });

          return {
            ...slot,
            available: !hasAppointmentConflict && !hasBlockedConflict
          };
        });

        setAvailableTimeSlots(updatedSlots);
        
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
