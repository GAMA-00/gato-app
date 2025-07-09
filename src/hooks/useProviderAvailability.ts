import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  available: boolean; // Add for compatibility
  conflictReason?: string;
}

export const useProviderAvailability = ({ providerId }: { providerId: string; selectedDate?: Date; serviceDuration?: number; recurrence?: string }) => {
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshAvailability = useCallback(async (param?: any) => {
    if (!providerId) return;
    
    setIsRefreshing(true);
    try {
      // Generate basic time slots for the day
      const slots: TimeSlot[] = [];
      for (let hour = 9; hour < 18; hour++) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          isAvailable: true,
          available: true // Add both for compatibility
        });
      }
      
      setAvailableTimeSlots(slots);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing availability:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [providerId]);

  useEffect(() => {
    if (providerId) {
      setIsLoading(true);
      refreshAvailability().finally(() => setIsLoading(false));
    }
  }, [providerId, refreshAvailability]);

  return {
    availableTimeSlots,
    isLoading,
    isRefreshing,
    lastUpdated,
    refreshAvailability
  };
};