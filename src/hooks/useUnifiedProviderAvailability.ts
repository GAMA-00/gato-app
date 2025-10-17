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
      
      // Construir ventanas base desde la disponibilidad configurada del proveedor
      const dayOfWeek = selectedDate.getDay();
      const { data: providerAvailability } = await supabase
        .from('provider_availability')
        .select('start_time, end_time')
        .eq('provider_id', providerId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      const workingHours = (providerAvailability && providerAvailability.length > 0)
        ? providerAvailability
        : [{ start_time: '08:00:00', end_time: '18:00:00' }];

      const toHM = (t: string) => t.slice(0, 5);

      const timeSlots: TimeSlot[] = [];
      const now = new Date();
      const step = Math.max(2, serviceDuration); // paso = duración del servicio (mín. 2m)
      for (const av of workingHours) {
        const [sH, sM] = toHM(av.start_time as string).split(':').map(Number);
        const [eH, eM] = toHM(av.end_time as string).split(':').map(Number);
        const windowStart = new Date(selectedDate);
        windowStart.setHours(sH, sM, 0, 0);
        const windowEnd = new Date(selectedDate);
        windowEnd.setHours(eH, eM, 0, 0);
        for (let t = new Date(windowStart); t.getTime() + serviceDuration * 60000 <= windowEnd.getTime(); t = new Date(t.getTime() + step * 60000)) {
          if (format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') && t <= now) continue;
          timeSlots.push({
            time: format(t, 'HH:mm'),
            available: true
          });
        }
      }

      // Check availability for each slot using unified validation
      const checkedSlots: TimeSlot[] = [];
      
      // First, get all blocked time slots for this provider on this date to optimize queries
      const { data: blockedTimeSlots } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', providerId)
        .eq('slot_date', format(selectedDate, 'yyyy-MM-dd'))
        .eq('recurring_blocked', true);
      
      const blockedSlotsMap = new Map();
      blockedTimeSlots?.forEach(slot => {
        if (slot.slot_datetime_start) {
          const slotTime = new Date(slot.slot_datetime_start).toTimeString().substring(0, 5);
          blockedSlotsMap.set(slotTime, slot);
        }
      });
      
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

        // Check if slot is blocked by recurring appointments (optimized lookup)
        if (blockedSlotsMap.has(slot.time)) {
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
      // Listen to provider time slots changes (including recurring blocked slots)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_time_slots',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('Real-time provider time slot update detected, invalidating cache for provider:', providerId);
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