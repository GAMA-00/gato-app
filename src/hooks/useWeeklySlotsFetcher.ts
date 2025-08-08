import { useState, useCallback, useRef } from 'react';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeTo12Hour } from '@/utils/timeSlotUtils';
import { WeeklySlot, UseWeeklySlotsProps } from '@/lib/weeklySlotTypes';
import { createSlotSignature, shouldBlockSlot } from '@/utils/weeklySlotUtils';
import { filterTemporalSlots, calculateWeekDateRange, filterSlotsByRecurrence } from '@/utils/temporalSlotFiltering';

interface UseWeeklySlotsFetcherReturn {
  slots: WeeklySlot[];
  isLoading: boolean;
  lastUpdated: Date | null;
  fetchWeeklySlots: () => Promise<void>;
  refreshSlots: () => void;
}

export const useWeeklySlotsFetcher = ({
  providerId,
  listingId,
  serviceDuration,
  recurrence = 'once',
  startDate,
  daysAhead = 7,
  weekIndex = 0
}: UseWeeklySlotsProps): UseWeeklySlotsFetcherReturn => {
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Stable cache for request deduplication
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<string>('');

  // Stable function to fetch slots - only recreated when essential params change
  const fetchWeeklySlots = useCallback(async () => {
    if (!providerId || !listingId || !serviceDuration) {
      return;
    }

    // Use correct week boundaries based on weekIndex
    const { startDate: weekStartDate, endDate: weekEndDate } = calculateWeekDateRange(weekIndex);
    const baseDate = startOfDay(weekStartDate);
    const endDate = startOfDay(weekEndDate);
    const paramsSignature = createSlotSignature(providerId, listingId, serviceDuration, recurrence, baseDate, endDate);
    
    // Prevent duplicate requests with same signature
    if (lastParamsRef.current === paramsSignature) {
      console.log('⏭️ Evitando petición duplicada:', paramsSignature);
      return;
    }
    
    console.log('🚀 Nueva petición con firma:', paramsSignature);
    lastParamsRef.current = paramsSignature;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    
    console.log('=== WEEKLY SLOTS DEBUG ===');
    console.log('Parámetros de consulta:', {
      providerId,
      listingId,
      serviceDuration,
      recurrence,
      baseDate: format(baseDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      paramsSignature
    });
    
    console.log('📅 Fechas de consulta detalladas:', {
      fechaHoy: format(new Date(), 'yyyy-MM-dd'),
      fechaOriginal: startDate ? format(startDate, 'yyyy-MM-dd') : 'no provided',
      fechaBase: format(baseDate, 'yyyy-MM-dd'),
      fechaFin: format(endDate, 'yyyy-MM-dd'),
      diasAdelante: daysAhead
    });
    
    try {
      // Fetch available time slots using adjusted dates
      const { data: timeSlots, error: slotsError } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', providerId)
        .eq('listing_id', listingId)
        .eq('is_available', true)
        .eq('is_reserved', false)
        .gte('slot_datetime_start', baseDate.toISOString())
        .lte('slot_datetime_start', endOfDay(endDate).toISOString())
        .order('slot_datetime_start');

      if (slotsError) throw slotsError;
      
      
      console.log('📊 Resultado de consulta timeSlots:', {
        totalSlots: timeSlots?.length || 0,
        filtros: { providerId, listingId, is_available: true, is_reserved: false },
        rangoFechas: { desde: format(baseDate, 'yyyy-MM-dd'), hasta: format(endDate, 'yyyy-MM-dd') },
        primeros3Slots: timeSlots?.slice(0, 3)?.map(s => ({ 
          fecha: s.slot_date, 
          hora: s.start_time, 
          disponible: s.is_available, 
          reservado: s.is_reserved,
          tipo: s.slot_type
        })),
        rangoFechasSlotsEncontrados: timeSlots?.length > 0 ? {
          primera: timeSlots[0]?.slot_date,
          ultima: timeSlots[timeSlots.length - 1]?.slot_date
        } : null
      });

      // Fetch conflicting appointments
      const { data: conflictingAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('provider_id', providerId)
        .in('status', ['confirmed', 'pending'])
         .gte('start_time', baseDate.toISOString())
         .lte('start_time', endOfDay(endDate).toISOString());

      if (appointmentsError) throw appointmentsError;

      // Process slots with proper timezone handling
      const weeklySlots: WeeklySlot[] = timeSlots?.map(slot => {
        // Use the slot_datetime_start as the single source of truth to avoid TZ mismatches
        const slotStart = new Date(slot.slot_datetime_start);
        const slotEnd = new Date(slot.slot_datetime_end);

        // Create a date object for the slot date (used for grouping)
        const slotDate = new Date(slotStart);

        // Derive the local 24h time (HH:mm) from slotStart to stay consistent
        const hh = slotStart.getHours().toString().padStart(2, '0');
        const mm = slotStart.getMinutes().toString().padStart(2, '0');
        const time24 = `${hh}:${mm}`;

        // Check if slot should be blocked
        const { isBlocked, reason } = shouldBlockSlot(slot, conflictingAppointments);

        // Display time in 12h format based on the same local time reference
        const { time: displayTime, period } = formatTimeTo12Hour(time24);

        // Slot is available only if it's not blocked
        const isSlotAvailable = !isBlocked;

        console.log(`Slot procesado (TZ-safe): ${slot.slot_date} ${time24} -> ${displayTime} ${period} (disponible: ${isSlotAvailable}, bloqueado: ${isBlocked})`);

        return {
          id: slot.id,
          date: slotDate,
          time: time24,
          displayTime,
          period,
          isAvailable: isSlotAvailable,
          conflictReason: reason
        };
      }) || [];
      
      // Apply temporal filtering based on week context
      const temporalFilteredSlots = filterTemporalSlots(weeklySlots, weekIndex);
      
      // Apply recurrence-based filtering
      const finalSlots = filterSlotsByRecurrence(temporalFilteredSlots, recurrence);
      
      console.log('🔄 Filtrado por recurrencia:', {
        tipoRecurrencia: recurrence,
        slotsAntesDeRecurrencia: temporalFilteredSlots.length,
        slotsDespuesDeRecurrencia: finalSlots.length,
        slotsEliminados: temporalFilteredSlots.length - finalSlots.length
      });
      
      setSlots(finalSlots);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching slots:', err);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, listingId, serviceDuration, recurrence, startDate, daysAhead, weekIndex]);

  // Create a stable refresh function
  const refreshSlots = useCallback(() => {
    console.log('WeeklySlots: Forzando actualización manual de slots');
    lastParamsRef.current = ''; // Clear cache to force refresh
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Trigger immediate fetch
    fetchWeeklySlots();
  }, [fetchWeeklySlots]);

  return {
    slots,
    isLoading,
    lastUpdated,
    fetchWeeklySlots,
    refreshSlots
  };
};