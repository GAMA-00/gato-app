import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WeeklySlot, WeeklySlotGroup, WeeklySlotStats, WeeklySlotsFetchParams } from '@/lib/weeklySlotTypes';
import { groupSlotsByDate, filterAvailableSlotGroups, calculateSlotStats } from '@/utils/weeklySlotUtils';
import { useWeeklySlotsFetcher } from './useWeeklySlotsFetcher';
import { useWeeklySlotsSubs } from './useWeeklySlotsSubs';

interface UseWeeklySlotsProps {
  providerId: string;
  listingId: string;
  serviceDuration: number;
  recurrence: string | null;
  startDate: Date;
  daysAhead?: number;
}

export const useWeeklySlots = ({
  providerId,
  listingId,
  serviceDuration,
  recurrence,
  startDate,
  daysAhead = 7
}: UseWeeklySlotsProps) => {
  const [isValidatingSlot, setIsValidatingSlot] = useState(false);

  const {
    slots,
    isLoading,
    error,
    lastUpdated,
    fetchWeeklySlots,
    clearCache,
    cleanup
  } = useWeeklySlotsFetcher();

  // Create fetch params
  const fetchParams: WeeklySlotsFetchParams = useMemo(() => ({
    providerId,
    listingId,
    serviceDuration,
    recurrence,
    startDate,
    daysAhead
  }), [providerId, listingId, serviceDuration, recurrence, startDate, daysAhead]);

  // Simplified validation for recurring slots - optimistic approach
  const validateSlot = useCallback(async (slot: WeeklySlot): Promise<boolean> => {
    if (!slot || isValidatingSlot) return false;
    
    setIsValidatingSlot(true);
    try {
      // Simple validation - assume slot is valid if it appears available
      await new Promise(resolve => setTimeout(resolve, 100));
      return slot.isAvailable;
    } catch (error) {
      console.error('Error validating slot:', error);
      return false;
    } finally {
      setIsValidatingSlot(false);
    }
  }, [isValidatingSlot]);

  // Refresh function
  const refreshSlots = useCallback(() => {
    clearCache();
    fetchWeeklySlots(fetchParams);
  }, [clearCache, fetchWeeklySlots, fetchParams]);

  // Process slots into groups
  const slotGroups = useMemo(() => {
    if (!slots.length) return [];
    return groupSlotsByDate(slots);
  }, [slots]);

  // Filter groups with available slots
  const availableSlotGroups = useMemo(() => {
    return filterAvailableSlotGroups(slotGroups);
  }, [slotGroups]);

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateSlotStats(slots);
  }, [slots]);

  // Set up real-time subscriptions
  useWeeklySlotsSubs({
    providerId,
    listingId,
    onRefresh: refreshSlots,
    clearCache
  });

  // Initial fetch and fetch when params change
  useEffect(() => {
    if (providerId && listingId && serviceDuration && startDate) {
      console.log('WeeklySlots: Fetching initial slots for:', {
        providerId,
        listingId
      });
      
      const timer = setTimeout(() => {
        fetchWeeklySlots(fetchParams);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fetchWeeklySlots, fetchParams]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    slotGroups,
    availableSlotGroups,
    stats,
    isLoading,
    isValidatingSlot,
    lastUpdated,
    validateSlot,
    refreshSlots,
    error
  };
};

// Export types for backward compatibility
export type { WeeklySlot, WeeklySlotGroup, WeeklySlotStats };