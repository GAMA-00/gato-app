import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { validateAppointmentSlot } from '@/utils/appointmentValidation';

interface TimeSlot {
  time: string;
  available: boolean;
  conflictReason?: string;
}

interface AvailabilityCache {
  [key: string]: {
    slots: TimeSlot[];
    timestamp: number;
    isLoading: boolean;
  };
}

// Global cache for provider availability across all services
const availabilityCache: AvailabilityCache = {};
const CACHE_DURATION = 30000; // 30 seconds

interface UseUnifiedProviderAvailabilityProps {
  providerId: string;
  selectedDate: Date;
  serviceDuration: number;
}

export const useUnifiedProviderAvailability = ({
  providerId,
  selectedDate,
  serviceDuration
}: UseUnifiedProviderAvailabilityProps) => {
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const cacheKey = `${providerId}-${format(selectedDate, 'yyyy-MM-dd')}-${serviceDuration}`;

  const fetchUnifiedAvailability = useCallback(async (forceRefresh = false) => {
    if (!providerId || !selectedDate) {
      console.log('Missing providerId or selectedDate');
      return;
    }

    // Check cache first
    const cached = availabilityCache[cacheKey];
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION && !cached.isLoading) {
      console.log(`Using cached availability for provider ${providerId}`);
      setAvailableTimeSlots(cached.slots);
      setLastUpdated(new Date(cached.timestamp));
      return;
    }

    // Set loading state in cache
    availabilityCache[cacheKey] = {
      slots: cached?.slots || [],
      timestamp: cached?.timestamp || now,
      isLoading: true
    };

    setIsLoading(true);
    
    try {
      console.log(`Fetching unified availability for provider ${providerId} on ${format(selectedDate, 'yyyy-MM-dd')}`);
      
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

      // Check availability for each slot using unified validation
      const checkedSlots: TimeSlot[] = [];
      
      for (const slot of timeSlots) {
        const [slotHour, slotMinute] = slot.time.split(':').map(Number);
        const slotStart = new Date(selectedDate);
        slotStart.setHours(slotHour, slotMinute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

        // Skip if slot would end after 7 PM
        if (slotEnd.getHours() >= 19) {
          continue;
        }

        // Check if slot is blocked by recurring appointments
        const { data: blockedSlots } = await supabase
          .from('provider_time_slots')
          .select('*')
          .eq('provider_id', providerId)
          .eq('slot_datetime_start', slotStart.toISOString())
          .eq('recurring_blocked', true)
          .single();

        if (blockedSlots) {
          // Slot is blocked by recurring appointment
          checkedSlots.push({
            time: slot.time,
            available: false,
            conflictReason: 'Bloqueado por cita recurrente'
          });
          continue;
        }

        // Validate slot against ALL provider appointments and blocks
        const validation = await validateAppointmentSlot(providerId, slotStart, slotEnd);
        
        if (!validation.hasConflict) {
          checkedSlots.push({
            time: slot.time,
            available: true
          });
        } else {
          // Include unavailable slots with reason for better UX
          checkedSlots.push({
            time: slot.time,
            available: false,
            conflictReason: validation.conflictReason
          });
        }
      }

      const availableCount = checkedSlots.filter(slot => slot.available).length;
      const unavailableCount = checkedSlots.filter(slot => !slot.available).length;
      console.log(`Provider ${providerId} unified availability: ${availableCount} available, ${unavailableCount} unavailable slots`);
      
      // Update cache
      const timestamp = Date.now();
      availabilityCache[cacheKey] = {
        slots: checkedSlots,
        timestamp,
        isLoading: false
      };

      setAvailableTimeSlots(checkedSlots);
      setLastUpdated(new Date(timestamp));
      
    } catch (error) {
      console.error('Error checking unified availability:', error);
      // Update cache with error state
      availabilityCache[cacheKey] = {
        slots: [],
        timestamp: Date.now(),
        isLoading: false
      };
      setAvailableTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, selectedDate, serviceDuration, cacheKey]);

  // Invalidate cache for this provider across all dates/services
  const invalidateProviderCache = useCallback(() => {
    Object.keys(availabilityCache).forEach(key => {
      if (key.startsWith(`${providerId}-`)) {
        delete availabilityCache[key];
      }
    });
    console.log(`Invalidated cache for provider ${providerId}`);
  }, [providerId]);

  // Auto fetch when dependencies change
  useEffect(() => {
    if (providerId && selectedDate) {
      fetchUnifiedAvailability();
    }
  }, [fetchUnifiedAvailability]);

  // Set up comprehensive real-time subscription for unified availability
  useEffect(() => {
    if (!providerId) return;

    console.log('Setting up unified real-time subscription for provider availability');
    
    const channel = supabase
      .channel(`unified-provider-availability-${providerId}`)
      // Listen to appointment changes (all appointments for this provider)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('Real-time appointment update detected, invalidating cache for provider:', providerId);
          invalidateProviderCache();
          fetchUnifiedAvailability(true);
        }
      )
      // Listen to blocked time slot changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_time_slots',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('Real-time blocked slot update detected, invalidating cache for provider:', providerId);
          invalidateProviderCache();
          fetchUnifiedAvailability(true);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up unified real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [providerId, invalidateProviderCache, fetchUnifiedAvailability]);

  return {
    availableTimeSlots: availableTimeSlots.filter(slot => slot.available), // Only return available slots
    allTimeSlots: availableTimeSlots, // Include all slots for debugging
    isLoading,
    lastUpdated,
    refreshAvailability: () => fetchUnifiedAvailability(true),
    invalidateCache: invalidateProviderCache
  };
};