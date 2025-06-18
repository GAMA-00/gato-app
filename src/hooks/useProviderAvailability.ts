
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, addDays, isSameDay } from 'date-fns';
import { validateAppointmentSlot } from '@/utils/appointmentValidation';

interface TimeSlot {
  time: string;
  available: boolean;
  conflictReason?: string;
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAvailability = useCallback(async (isManualRefresh = false) => {
    if (!providerId || !selectedDate) return;

    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      console.log(`Fetching availability for provider ${providerId} on ${format(selectedDate, 'yyyy-MM-dd')}`);
      
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

      // Check availability for each slot using the validation utility
      const availableSlots = [];
      
      for (const slot of timeSlots) {
        const [slotHour, slotMinute] = slot.time.split(':').map(Number);
        const slotStart = new Date(selectedDate);
        slotStart.setHours(slotHour, slotMinute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

        // Validate this specific slot
        const validation = await validateAppointmentSlot(providerId, slotStart, slotEnd);
        
        if (!validation.hasConflict) {
          availableSlots.push({
            time: slot.time,
            available: true
          });
        } else {
          // Still add to list but mark as unavailable for debugging
          availableSlots.push({
            time: slot.time,
            available: false,
            conflictReason: validation.conflictReason
          });
        }
      }

      // Filter only available slots for the final result
      const finalAvailableSlots = availableSlots.filter(slot => slot.available);
      
      setAvailableTimeSlots(finalAvailableSlots);
      setLastUpdated(new Date());
      
      console.log(`Generated ${finalAvailableSlots.length} available slots out of ${timeSlots.length} total slots`);
      
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailableTimeSlots([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [providerId, selectedDate, serviceDuration]);

  // Manual refresh function
  const refreshAvailability = useCallback(() => {
    console.log('Manual refresh triggered');
    fetchAvailability(true);
  }, [fetchAvailability]);

  // Auto fetch when dependencies change
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Set up real-time subscription for appointment changes
  useEffect(() => {
    if (!providerId) return;

    console.log('Setting up real-time subscription for appointments');
    
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('Real-time update detected:', payload);
          // Auto-refresh availability when appointments change
          fetchAvailability();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [providerId, fetchAvailability]);

  return {
    availableTimeSlots,
    isLoading,
    isRefreshing,
    lastUpdated,
    refreshAvailability
  };
};
