import { useState, useCallback, useRef } from 'react';
import { addDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { WeeklySlot, WeeklySlotsFetchParams, WeeklySlotsFetchResult } from '@/lib/weeklySlotTypes';
import { createWeeklySlot, createParamsSignature } from '@/utils/weeklySlotUtils';

export const useWeeklySlotsFetcher = () => {
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<string>('');

  const fetchWeeklySlots = useCallback(async (params: WeeklySlotsFetchParams) => {
    const { providerId, listingId, serviceDuration, recurrence, startDate, daysAhead = 7 } = params;

    if (!providerId || !listingId || !serviceDuration || !startDate) {
      console.log('⚠️ Missing required parameters for fetchWeeklySlots');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const baseDate = startDate;
      const endDate = addDays(baseDate, daysAhead);
      
      // Create params signature for deduplication
      const paramsSignature = createParamsSignature({
        providerId,
        listingId,
        serviceDuration,
        recurrence: recurrence || 'none',
        baseDate,
        endDate
      });
      
      // Prevent duplicate requests
      if (lastParamsRef.current === paramsSignature) {
        console.log('⏭️ Evitando petición duplicada:', paramsSignature);
        return;
      }

      lastParamsRef.current = paramsSignature;

      console.log('🔄 Fetching weekly slots:', {
        providerId,
        listingId,
        serviceDuration,
        recurrence,
        baseDate: format(baseDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      });

      // Fetch available slots
      const { data: slotsData, error: slotsError } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', providerId)
        .eq('listing_id', listingId)
        .gte('slot_date', format(baseDate, 'yyyy-MM-dd'))
        .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
        .order('slot_datetime_start', { ascending: true });

      if (abortControllerRef.current?.signal.aborted) return;

      if (slotsError) {
        throw slotsError;
      }

      // Fetch conflicting appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('provider_id', providerId)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', baseDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (abortControllerRef.current?.signal.aborted) return;

      if (appointmentsError) {
        console.warn('Error fetching appointments:', appointmentsError);
      }

      // Process slots with conflict detection
      const processedSlots: WeeklySlot[] = (slotsData || []).map(slot => {
        const weeklySlot = createWeeklySlot(slot);
        
        // Check for appointment conflicts
        if (appointmentsData) {
          const hasConflict = appointmentsData.some(apt => {
            const aptStart = new Date(apt.start_time);
            const aptEnd = new Date(apt.end_time);
            return (
              aptStart < weeklySlot.endTime &&
              aptEnd > weeklySlot.startTime
            );
          });
          
          if (hasConflict) {
            weeklySlot.isAvailable = false;
            weeklySlot.hasConflict = true;
            weeklySlot.conflictReason = 'Cita programada';
          }
        }
        
        return weeklySlot;
      });

      setSlots(processedSlots);
      setLastUpdated(new Date());
      
      console.log('✅ Weekly slots loaded:', processedSlots.length);

    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        console.log('🚫 Request aborted');
        return;
      }
      
      console.error('❌ Error fetching weekly slots:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    lastParamsRef.current = '';
  }, []);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    slots,
    isLoading,
    error,
    lastUpdated,
    fetchWeeklySlots,
    clearCache,
    cleanup
  };
};