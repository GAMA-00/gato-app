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
      // Consultar slots con datetime y legacy en paralelo y fusionar resultados
      const [dtRes, legacyRes, apptRes] = await Promise.all([
        supabase
          .from('provider_time_slots')
          .select('*')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .eq('is_available', true)
          .eq('is_reserved', false)
          .gte('slot_datetime_start', baseDate.toISOString())
          .lte('slot_datetime_start', endOfDay(endDate).toISOString())
          .order('slot_datetime_start'),
        supabase
          .from('provider_time_slots')
          .select('*')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .eq('is_available', true)
          .eq('is_reserved', false)
          .gte('slot_date', format(baseDate, 'yyyy-MM-dd'))
          .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
          .order('slot_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('appointments')
          .select('start_time, end_time, status')
          .eq('provider_id', providerId)
          .in('status', ['confirmed', 'pending'])
          .gte('start_time', baseDate.toISOString())
          .lte('start_time', endOfDay(endDate).toISOString())
      ]);

      if (dtRes.error) throw dtRes.error;
      if (legacyRes.error) throw legacyRes.error;
      if (apptRes.error) throw apptRes.error;

      const timeSlotsDt = dtRes.data || [];
      const timeSlotsLegacy = legacyRes.data || [];

      // Fusionar y desduplicar por id (priorizar registros con datetime)
      const byId = new Map<string, any>();
      for (const s of [...timeSlotsLegacy, ...timeSlotsDt]) {
        const key = String(s.id);
        if (!byId.has(key)) {
          byId.set(key, s);
        } else {
          const existing = byId.get(key);
          const existingHasDt = !!existing.slot_datetime_start && !!existing.slot_datetime_end;
          const candidateHasDt = !!s.slot_datetime_start && !!s.slot_datetime_end;
          if (!existingHasDt && candidateHasDt) byId.set(key, s);
        }
      }
      const mergedSlots = Array.from(byId.values()).filter(s => s.is_available && !s.is_reserved);

      console.log('📊 Fusión de slots:', {
        totalDatetime: timeSlotsDt.length,
        totalLegacy: timeSlotsLegacy.length,
        mergedUnicos: mergedSlots.length,
        rangoFechas: { desde: format(baseDate, 'yyyy-MM-dd'), hasta: format(endDate, 'yyyy-MM-dd') }
      });

      const conflictingAppointments = apptRes.data || [];

      // Procesar slots con manejo correcto de TZ y compatibilidad legacy
      const weeklySlots: WeeklySlot[] = mergedSlots.map(slot => {
        // Calcular inicio/fin
        let slotStart: Date;
        let slotEnd: Date;
        if (slot.slot_datetime_start) {
          slotStart = new Date(slot.slot_datetime_start);
          slotEnd = slot.slot_datetime_end
            ? new Date(slot.slot_datetime_end)
            : new Date(slotStart.getTime() + serviceDuration * 60_000);
        } else {
          const dateStr: string = slot.slot_date; // YYYY-MM-DD
          const timeStr: string = slot.start_time || '00:00:00'; // HH:mm:ss
          // Interpretar como hora local
          slotStart = new Date(`${dateStr}T${timeStr}`);
          slotEnd = new Date(slotStart.getTime() + serviceDuration * 60_000);
        }

        // Construir objeto con datetime para la detección de conflictos
        const slotForBlock = {
          ...slot,
          slot_datetime_start: slotStart.toISOString(),
          slot_datetime_end: slotEnd.toISOString(),
        };
        const { isBlocked, reason } = shouldBlockSlot(slotForBlock, conflictingAppointments);

        // Datos para UI
        const slotDate = new Date(slotStart);
        const hh = slotStart.getHours().toString().padStart(2, '0');
        const mm = slotStart.getMinutes().toString().padStart(2, '0');
        const time24 = `${hh}:${mm}`;
        const { time: displayTime, period } = formatTimeTo12Hour(time24);

        console.log(`Slot procesado: ${format(slotDate, 'yyyy-MM-dd')} ${time24} -> ${displayTime} ${period} (disp: ${!isBlocked})`);

        return {
          id: slot.id,
          date: slotDate,
          time: time24,
          displayTime,
          period,
          isAvailable: !isBlocked,
          conflictReason: reason
        };
      });

      // Calcular recomendación basada en citas adyacentes (no aplica a bloqueos manuales)
      // Crear un mapa de horas ocupadas por citas por fecha
      const apptHoursByDate: Record<string, Set<number>> = {};
      for (const apt of conflictingAppointments) {
        try {
          const start = new Date(apt.start_time);
          const end = new Date(apt.end_time);
          const dateKey = format(start, 'yyyy-MM-dd');
          if (!apptHoursByDate[dateKey]) apptHoursByDate[dateKey] = new Set<number>();
          let h = start.getHours();
          const endHour = Math.max(h, end.getHours());
          while (h < endHour) {
            apptHoursByDate[dateKey].add(h);
            h++;
          }
        } catch {}
      }

      const weeklySlotsWithRec: WeeklySlot[] = weeklySlots.map(s => {
        if (!s.isAvailable) return s;
        const dateKey = format(s.date, 'yyyy-MM-dd');
        const hour = parseInt(s.time.split(':')[0], 10);
        const hours = apptHoursByDate[dateKey] || new Set<number>();
        const isRecommended = hours.has(hour - 1) || hours.has(hour + 1);
        return { ...s, isRecommended };
      });

      // Filtrado temporal y por recurrencia
      const temporalFilteredSlots = filterTemporalSlots(weeklySlotsWithRec, weekIndex);
      const finalSlots = filterSlotsByRecurrence(temporalFilteredSlots, recurrence);

      console.log('🔄 Resumen de filtrado:', {
        semana: weekIndex,
        antesTemporal: weeklySlots.length,
        despuesTemporal: temporalFilteredSlots.length,
        despuesRecurrencia: finalSlots.length
      });

      setSlots(finalSlots);
      setLastUpdated(new Date());
      
    } catch (err) {
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