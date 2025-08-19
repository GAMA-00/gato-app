import { useState, useCallback, useRef } from 'react';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeTo12Hour } from '@/utils/timeSlotUtils';
import { WeeklySlot, UseWeeklySlotsProps } from '@/lib/weeklySlotTypes';
import { createSlotSignature, shouldBlockSlot } from '@/utils/weeklySlotUtils';
import { filterTemporalSlots, calculateWeekDateRange, filterSlotsByRecurrence } from '@/utils/temporalSlotFiltering';
import { generateFutureInstancesFromAppointment } from '@/lib/recurrence/generator';
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
  weekIndex = 0,
  clientResidenciaId
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
    const paramsSignature = createSlotSignature(providerId, listingId, serviceDuration, recurrence, baseDate, endDate) + `|res:${clientResidenciaId || 'none'}`;
    
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
      const [dtRes, legacyRes, apptAllRes, apptDirectRes, apptRecurringBaseRes] = await Promise.all([
        supabase
          .from('provider_time_slots')
          .select('*')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .gte('slot_datetime_start', baseDate.toISOString())
          .lte('slot_datetime_start', endOfDay(endDate).toISOString())
          .order('slot_datetime_start'),
        supabase
          .from('provider_time_slots')
          .select('*')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .gte('slot_date', format(baseDate, 'yyyy-MM-dd'))
          .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
          .order('slot_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('appointments')
          .select('start_time, end_time, status, is_recurring_instance, external_booking, recurrence, residencia_id')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .in('status', ['confirmed', 'pending'])
          .gte('start_time', baseDate.toISOString())
          .lte('start_time', endOfDay(endDate).toISOString()),
        clientResidenciaId ?
          supabase
            .from('appointments')
            .select('id, start_time, end_time, status, external_booking, recurrence, residencia_id')
            .eq('provider_id', providerId)
            .eq('listing_id', listingId)
            .in('status', ['confirmed', 'pending'])
            .eq('residencia_id', clientResidenciaId)
            .gte('start_time', baseDate.toISOString())
            .lte('start_time', endOfDay(endDate).toISOString())
          : Promise.resolve({ data: [], error: null }),
        // recurring base for all residencias
          supabase
            .from('appointments')
            .select('id, provider_id, listing_id, client_id, residencia_id, start_time, end_time, recurrence, status, external_booking')
            .eq('provider_id', providerId)
            .eq('listing_id', listingId)
            .in('status', ['confirmed', 'pending'])
            .not('recurrence', 'in', '("none","once")')
            .lte('start_time', endOfDay(endDate).toISOString())
      ]);

      if (dtRes.error) throw dtRes.error;
      if (legacyRes.error) throw legacyRes.error;
      if (apptAllRes.error) throw apptAllRes.error;
      if (apptDirectRes && 'error' in apptDirectRes && apptDirectRes.error) throw apptDirectRes.error;
      if (apptRecurringBaseRes && 'error' in apptRecurringBaseRes && apptRecurringBaseRes.error) throw apptRecurringBaseRes.error;

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
      const mergedSlots = Array.from(byId.values());
      
      // Validar filtros de rango de fecha
      const validRangeSlots = mergedSlots.filter(slot => {
        const slotDateStr = slot.slot_date;
        if (!slotDateStr) return true; // Slots sin fecha pasan la validación
        
        const slotDate = new Date(slotDateStr + 'T00:00:00');
        const isInRange = slotDate >= baseDate && slotDate <= endDate;
        
        if (!isInRange) {
          console.log(`🔍 Slot fuera de rango filtrado: ${slotDateStr} (rango: ${format(baseDate, 'yyyy-MM-dd')} - ${format(endDate, 'yyyy-MM-dd')})`);
        }
        
        return isInRange;
      });

      console.log('📊 Fusión de slots:', {
        totalDatetime: timeSlotsDt.length,
        totalLegacy: timeSlotsLegacy.length,
        mergedUnicos: mergedSlots.length,
        validRangeSlots: validRangeSlots.length,
        rangoFechas: { desde: format(baseDate, 'yyyy-MM-dd'), hasta: format(endDate, 'yyyy-MM-dd') }
      });

      const allAppointments = apptAllRes.data || [];
      
      // Generate future recurring instances to include in conflicts
      const recurringBaseAll = (apptRecurringBaseRes.data || []).filter((apt: any) => {
        return apt && apt.recurrence && apt.recurrence !== 'none' && apt.recurrence !== 'once';
      });

      const generatedInstances: any[] = [];
      for (const base of recurringBaseAll) {
        try {
          const gens = generateFutureInstancesFromAppointment(base, baseDate, endOfDay(endDate), 50);
          generatedInstances.push(...gens);
        } catch (e) {
          console.log('Recurrence generation error:', e);
        }
      }

      // Include recurring instances in conflicts to block recurring slots
      const allConflicts = [...allAppointments, ...generatedInstances];

      // Procesar slots con manejo correcto de TZ y compatibilidad legacy
      const weeklySlots: WeeklySlot[] = validRangeSlots.map(slot => {
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
        const { isBlocked, reason } = shouldBlockSlot(slotForBlock, allConflicts);

        // Datos para UI
        const slotDate = new Date(slotStart);
        const hh = slotStart.getHours().toString().padStart(2, '0');
        const mm = slotStart.getMinutes().toString().padStart(2, '0');
        const time24 = `${hh}:${mm}`;
        const { time: displayTime, period } = formatTimeTo12Hour(time24);

        // Solo mostrar slots que no están bloqueados manualmente, excepto si es un bloqueo manual específico
        const isManuallyBlocked = !slot.is_available && slot.slot_type !== 'reserved';
        const shouldShow = slot.is_available || !isManuallyBlocked;

        if (!shouldShow) {
          console.log(`🚫 Slot bloqueado manualmente ocultado: ${format(slotDate, 'yyyy-MM-dd')} ${time24}`);
          return null;
        }

        console.log(`✅ Slot procesado: ${format(slotDate, 'yyyy-MM-dd')} ${time24} -> ${displayTime} ${period} (disp: ${!isBlocked})`);

        return {
          id: slot.id,
          date: slotDate,
          time: time24,
          displayTime,
          period,
          isAvailable: !isBlocked,
          conflictReason: reason
        };
      }).filter(Boolean) as WeeklySlot[]; // Filtrar slots nulos (bloqueados manualmente)

      // Fallback: generar slots a partir de la disponibilidad del listing para cubrir huecos
      let enrichedSlots: WeeklySlot[] = weeklySlots;
      try {
        const listingAvailRes = await supabase
          .from('listings')
          .select('availability')
          .eq('id', listingId)
          .maybeSingle();

        const availability = listingAvailRes.data?.availability;
        if (availability) {
          const existingKeys = new Set(enrichedSlots.map(s => `${format(s.date, 'yyyy-MM-dd')}-${s.time}`));
          const additional: WeeklySlot[] = [];
          const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

          for (let d = new Date(baseDate); d.getTime() <= endDate.getTime(); d = addDays(d, 1)) {
            const dayKey = dayKeys[d.getDay()];
            const dayCfg = availability[dayKey];
            if (!dayCfg?.enabled || !Array.isArray(dayCfg.timeSlots)) continue;

            for (const win of dayCfg.timeSlots) {
              // Generar horas en pasos de serviceDuration
              const genTimes: string[] = (() => {
                const times: string[] = [];
                const [sh, sm] = win.startTime.split(':').map(Number);
                const [eh, em] = win.endTime.split(':').map(Number);
                const startMin = (sh || 0) * 60 + (sm || 0);
                const endMin = (eh || 0) * 60 + (em || 0);
                for (let m = startMin; m + serviceDuration <= endMin; m += serviceDuration) {
                  const hh = Math.floor(m / 60).toString().padStart(2, '0');
                  const mm = (m % 60).toString().padStart(2, '0');
                  times.push(`${hh}:${mm}`);
                }
                return times;
              })();

              for (const time of genTimes) {
                const key = `${format(d, 'yyyy-MM-dd')}-${time}`;
                if (existingKeys.has(key)) continue; // ya existe desde BD (incluye bloqueados manualmente)

                const slotDate = new Date(d);
                const [hh, mm] = time.split(':').map(n => parseInt(n, 10));
                slotDate.setHours(hh, mm || 0, 0, 0);
                const slotEnd = new Date(slotDate.getTime() + serviceDuration * 60_000);

                const virtualForBlock = {
                  is_available: true,
                  slot_datetime_start: slotDate.toISOString(),
                  slot_datetime_end: slotEnd.toISOString(),
                } as any;
                const { isBlocked, reason } = shouldBlockSlot(virtualForBlock, allConflicts);
                const { time: displayTime, period } = formatTimeTo12Hour(time);

                additional.push({
                  id: key,
                  date: new Date(slotDate),
                  time,
                  displayTime,
                  period,
                  isAvailable: !isBlocked,
                  conflictReason: reason
                });
              }
            }
          }

          if (additional.length > 0) {
            enrichedSlots = [...enrichedSlots, ...additional];
            console.log('🧩 Fallback de disponibilidad aplicado', {
              agregados: additional.length,
              total_resultado: enrichedSlots.length
            });
          }
        }
      } catch (e) {
        console.log('ℹ️ No se pudo cargar disponibilidad del listing para fallback:', e);
      }

      // Calcular recomendación basada en adyacencia respecto a TODAS las reservas (puntuales y recurrentes)
      const apptStartMinutesByDate: Record<string, Set<number>> = {};
      const apptEndMinutesByDate: Record<string, Set<number>> = {};

      // Usar todas las citas del rango (pendientes/confirmadas) y las instancias generadas
      const adjacentPool = [...allAppointments, ...generatedInstances];
      for (const apt of adjacentPool) {
        try {
          const start = new Date(apt.start_time);
          const end = apt.end_time ? new Date(apt.end_time) : new Date(start.getTime() + serviceDuration * 60_000);
          const startKey = format(start, 'yyyy-MM-dd');
          const endKey = format(end, 'yyyy-MM-dd');
          const startMin = start.getHours() * 60 + start.getMinutes();
          const endMin = end.getHours() * 60 + end.getMinutes();
          if (!apptStartMinutesByDate[startKey]) apptStartMinutesByDate[startKey] = new Set<number>();
          if (!apptEndMinutesByDate[endKey]) apptEndMinutesByDate[endKey] = new Set<number>();
          apptStartMinutesByDate[startKey].add(startMin);
          apptEndMinutesByDate[endKey].add(endMin);
        } catch {}
      }

      // Detectar el paso real entre slots por día (ej. 60 min), independiente de serviceDuration
      const slotStepByDate: Record<string, number> = {};
      const minutesByDate: Record<string, number[]> = {};
      // 1) Minutos de los slots configurados
      for (const s of enrichedSlots) {
        const dateKey = format(s.date, 'yyyy-MM-dd');
        const [hh, mm] = s.time.split(':').map(n => parseInt(n, 10));
        const min = (hh * 60) + (mm || 0);
        if (!minutesByDate[dateKey]) minutesByDate[dateKey] = [];
        minutesByDate[dateKey].push(min);
      }
      // 2) También considerar minutos de citas (internas) para calcular el paso
      for (const apt of adjacentPool) {
        try {
          const start = new Date(apt.start_time);
          const dateKey = format(start, 'yyyy-MM-dd');
          const minutes = start.getHours() * 60 + start.getMinutes();
          if (!minutesByDate[dateKey]) minutesByDate[dateKey] = [];
          minutesByDate[dateKey].push(minutes);
        } catch {}
      }
      for (const [dateKey, mins] of Object.entries(minutesByDate)) {
        const uniq = Array.from(new Set(mins)).sort((a, b) => a - b);
        let step = 0;
        for (let i = 1; i < uniq.length; i++) {
          const diff = uniq[i] - uniq[i - 1];
          if (diff > 0) step = step === 0 ? diff : Math.min(step, diff);
        }
        slotStepByDate[dateKey] = step > 0 ? step : 60; // fallback a 60 min
      }

      const weeklySlotsWithRec: WeeklySlot[] = enrichedSlots.map(s => {
        if (!s.isAvailable) return s;
        const dateKey = format(s.date, 'yyyy-MM-dd');
        const [hh, mm] = s.time.split(':').map(n => parseInt(n, 10));
        const slotMin = (hh * 60) + (mm || 0);
        const apptStarts = apptStartMinutesByDate[dateKey] || new Set<number>();
        const apptEnds = apptEndMinutesByDate[dateKey] || new Set<number>();
        const step = slotStepByDate[dateKey] || 60;
        // Recomendado si el siguiente slot inmediato es inicio de cita, o si justo antes terminó una cita
        const isRecommended = apptStarts.has(slotMin + step) || apptEnds.has(slotMin);
        return { ...s, isRecommended };
      });

      // Filtrado temporal y por recurrencia
      const temporalFilteredSlots = filterTemporalSlots(weeklySlotsWithRec, weekIndex);
      const finalSlots = filterSlotsByRecurrence(temporalFilteredSlots, recurrence);

      console.log('🔄 Resumen de filtrado:', {
        semana: weekIndex,
        antesTemporal: enrichedSlots.length,
        despuesTemporal: temporalFilteredSlots.length,
        despuesRecurrencia: finalSlots.length
      });

      setSlots(finalSlots);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching slots:', err);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, listingId, serviceDuration, recurrence, startDate, daysAhead, weekIndex, clientResidenciaId]);

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