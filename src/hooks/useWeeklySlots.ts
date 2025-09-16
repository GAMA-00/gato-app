import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  WeeklySlot, 
  WeeklySlotGroup, 
  UseWeeklySlotsProps, 
  UseWeeklySlotsReturn 
} from '@/lib/weeklySlotTypes';
import { 
  groupSlotsByDate, 
  filterAvailableSlotGroups, 
  calculateSlotStats 
} from '@/utils/weeklySlotUtils';
import { useWeeklySlotsFetcher } from './useWeeklySlotsFetcher';
import { useWeeklySlotsSubs } from './useWeeklySlotsSubs';

export const useWeeklySlots = ({
  providerId,
  listingId,
  serviceDuration,
  recurrence = 'once',
  startDate,
  daysAhead = 7,
  weekIndex = 0,
  clientResidenciaId
}: UseWeeklySlotsProps): UseWeeklySlotsReturn => {
  const [isValidatingSlot, setIsValidatingSlot] = useState(false);

  // Use the fetcher hook for data management
  const {
    slots,
    isLoading,
    lastUpdated,
    fetchWeeklySlots,
    refreshSlots
  } = useWeeklySlotsFetcher({
    providerId,
    listingId,
    serviceDuration,
    recurrence,
    startDate,
    daysAhead,
    weekIndex,
    clientResidenciaId
  });

  // Handle real-time subscriptions
  useWeeklySlotsSubs({
    providerId,
    listingId,
    onSlotsChanged: fetchWeeklySlots
  });

  // Database-driven validation for recurring slots
  const validateSlot = async (slot: WeeklySlot): Promise<boolean> => {
    if (!providerId || !listingId) return false;
    
    try {
      // Check current slot status in database
      const { data: currentSlot } = await supabase
        .from('provider_time_slots')
        .select('is_available, recurring_blocked, slot_type, is_reserved')
        .eq('id', slot.id)
        .single();
      
      if (!currentSlot) {
        console.log(`⚠️ Slot ${slot.id} no encontrado en base de datos`);
        return false;
      }
      
      const isAvailable = currentSlot.is_available && !currentSlot.recurring_blocked && !currentSlot.is_reserved;
      console.log(`📋 Validación de slot ${slot.time}: ${isAvailable ? 'disponible' : 'bloqueado'}`, currentSlot);
      return isAvailable;
    } catch (error) {
      console.error('Error validando slot:', error);
      return false;
    }
  };

  // Group slots by date for easier rendering
  const slotGroups = useMemo(() => groupSlotsByDate(slots), [slots]);

  // Filter to show only days with available slots
  const availableSlotGroups = useMemo(() => filterAvailableSlotGroups(slotGroups), [slotGroups]);

  // Calculate statistics
  const stats = useMemo(() => calculateSlotStats(slots, slotGroups, availableSlotGroups), [slots, slotGroups, availableSlotGroups]);

  // Effect to trigger fetch when essential params change
  useEffect(() => {
    if (providerId && listingId && serviceDuration > 0) {
      console.log('🔄 Disparando fetch por cambio de parámetros:', {
        startDate: startDate ? startDate.toISOString().split('T')[0] : 'today',
        providerId,
        listingId
      });
      
      const timer = setTimeout(() => {
        fetchWeeklySlots();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [providerId, listingId, serviceDuration, recurrence, startDate?.getTime(), weekIndex, clientResidenciaId, fetchWeeklySlots]);

  return {
    slotGroups,
    availableSlotGroups,
    stats,
    isLoading,
    isValidatingSlot,
    lastUpdated,
    validateSlot,
    refreshSlots
  };
};