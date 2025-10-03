import { useState, useCallback, useRef } from 'react';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeTo12Hour } from '@/utils/timeSlotUtils';
import { WeeklySlot, UseWeeklySlotsProps } from '@/lib/weeklySlotTypes';
import { createSlotSignature, shouldBlockSlot } from '@/utils/weeklySlotUtils';
import { filterTemporalSlots, calculateWeekDateRange, filterSlotsByRecurrence } from '@/utils/temporalSlotFiltering';
// Removed virtual instance generation - relying on database state only
import { ensureAllSlotsExist } from '@/utils/slotRegenerationUtils';
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
      // Consultar slots con datetime y legacy en paralelo y fusionar resultados, incluyendo slot_preferences
      const [dtRes, legacyRes, apptAllRes, apptDirectRes, apptRecurringBaseRes, listingRes] = await Promise.all([
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
            .lte('start_time', endOfDay(endDate).toISOString()),
        // obtener configuraciones del listing
        supabase
          .from('listings')
          .select('slot_preferences')
          .eq('id', listingId)
          .single(),
        // Fetch legacy recurring appointments (confirmed appointments with recurrence)
        supabase
          .from('appointments')
          .select('*')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .eq('status', 'confirmed')
          .not('recurrence', 'is', null)
          .neq('recurrence', 'none')
          .neq('recurrence', 'once')
      ]);

      const legacyRecurringRes = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .eq('status', 'confirmed')
          .not('recurrence', 'is', null)
          .neq('recurrence', 'none')
          .neq('recurrence', 'once')
      ]);

      if (dtRes.error) throw dtRes.error;
      if (legacyRes.error) throw legacyRes.error;
      if (apptAllRes.error) throw apptAllRes.error;
      if (apptDirectRes && 'error' in apptDirectRes && apptDirectRes.error) throw apptDirectRes.error;
      if (apptRecurringBaseRes && 'error' in apptRecurringBaseRes && apptRecurringBaseRes.error) throw apptRecurringBaseRes.error;
      if (listingRes.error) throw listingRes.error;
      if (legacyRecurringRes[0].error) throw legacyRecurringRes[0].error;

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

      // PASO 1: Asegurar que todos los slots necesarios existan en la base de datos
      console.log('🔧 Asegurando consistencia de slots en base de datos...');
      
      try {
        // Obtener disponibilidad del proveedor para generar slots faltantes
        const providerAvailRes = await supabase
          .from('provider_availability')
          .select('*')
          .eq('provider_id', providerId)
          .eq('is_active', true);

        if (providerAvailRes.data && providerAvailRes.data.length > 0) {
          console.log('✅ Disponibilidad del proveedor encontrada, regenerando slots...');
          
          // Usar la función centralizada para asegurar consistencia
          await ensureAllSlotsExist(
            providerId,
            listingId,
            baseDate,
            endDate,
            providerAvailRes.data,
            validRangeSlots,
            serviceDuration
          );
          
          console.log('🔄 Slots regenerados, obteniendo datos actualizados...');
          
          // Re-fetch slots después de la regeneración para obtener datos consistentes
          const [updatedDtRes, updatedLegacyRes] = await Promise.all([
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
              .order('start_time', { ascending: true })
          ]);
          
          // Actualizar con datos frescos después de la regeneración
          const updatedTimeSlotsDt = updatedDtRes.data || [];
          const updatedTimeSlotsLegacy = updatedLegacyRes.data || [];
          
          // Re-fusionar con datos actualizados
          const updatedById = new Map<string, any>();
          for (const s of [...updatedTimeSlotsLegacy, ...updatedTimeSlotsDt]) {
            const key = String(s.id);
            if (!updatedById.has(key)) {
              updatedById.set(key, s);
            } else {
              const existing = updatedById.get(key);
              const existingHasDt = !!existing.slot_datetime_start && !!existing.slot_datetime_end;
              const candidateHasDt = !!s.slot_datetime_start && !!s.slot_datetime_end;
              if (!existingHasDt && candidateHasDt) updatedById.set(key, s);
            }
          }
          
          // Usar slots actualizados después de regeneración
          const updatedMerged = Array.from(updatedById.values());
          validRangeSlots.splice(0, validRangeSlots.length, ...updatedMerged.filter(slot => {
            const slotDateStr = slot.slot_date;
            if (!slotDateStr) return true;
            const slotDate = new Date(slotDateStr + 'T00:00:00');
            return slotDate >= baseDate && slotDate <= endDate;
          }));
          
          console.log('✅ Slots actualizados después de regeneración:', validRangeSlots.length);
        }
      } catch (e) {
        console.log('⚠️ Error en regeneración de slots, continuando con datos existentes:', e);
      }

      // PASO 2: Procesar SOLO slots de base de datos (sin fallbacks virtuales)
      console.log('📊 Procesando slots de base de datos (sin fallbacks):', {
        totalSlots: validRangeSlots.length,
        rangoFechas: { desde: format(baseDate, 'yyyy-MM-dd'), hasta: format(endDate, 'yyyy-MM-dd') }
      });

      // Get confirmed appointments and project legacy recurring appointments into the future
      const allAppointments = apptAllRes.data || [];
      const legacyRecurring = legacyRecurringRes[0].data || [];
      
      console.log('🔄 Sistema Legacy de Recurrencia:', {
        citasRecurrentesLegacy: legacyRecurring.length,
        desglose: {
          weekly: legacyRecurring.filter(a => a.recurrence === 'weekly').length,
          biweekly: legacyRecurring.filter(a => a.recurrence === 'biweekly').length,
          monthly: legacyRecurring.filter(a => a.recurrence === 'monthly').length
        }
      });

      // Project legacy recurring appointments into future occurrences (up to 8 weeks)
      const projectedLegacyOccurrences: Array<{ id: string; start: Date; end: Date }> = [];
      const maxWeeksToProject = 8;
      
      for (const appt of legacyRecurring) {
        const originalStart = new Date(appt.start_time);
        const originalEnd = new Date(appt.end_time);
        const dayOfWeek = originalStart.getDay(); // 0=Sunday, 1=Monday, etc.
        const duration = originalEnd.getTime() - originalStart.getTime();
        
        // Calculate projections based on recurrence type
        for (let weekOffset = 0; weekOffset < maxWeeksToProject; weekOffset++) {
          let projectedDate: Date | null = null;
          
          switch (appt.recurrence) {
            case 'weekly':
              // Every week, same day and time
              projectedDate = new Date(originalStart);
              projectedDate.setDate(originalStart.getDate() + (weekOffset * 7));
              break;
              
            case 'biweekly':
              // Every 2 weeks
              if (weekOffset % 2 === 0) {
                projectedDate = new Date(originalStart);
                projectedDate.setDate(originalStart.getDate() + (weekOffset * 7));
              }
              break;
              
            case 'monthly':
              // Monthly pattern: try to keep same week-of-month and day-of-week
              // Simplified: add ~4 weeks per iteration (will skip some weeks)
              if (weekOffset % 4 === 0 && weekOffset > 0) {
                const monthsToAdd = Math.floor(weekOffset / 4);
                projectedDate = new Date(originalStart);
                projectedDate.setMonth(originalStart.getMonth() + monthsToAdd);
                
                // Adjust to same day of week if needed
                while (projectedDate.getDay() !== dayOfWeek) {
                  projectedDate.setDate(projectedDate.getDate() + 1);
                  if (projectedDate.getDate() > 28) break; // Safety check
                }
              }
              break;
          }
          
          if (projectedDate && projectedDate >= baseDate && projectedDate <= endDate) {
            const projectedEnd = new Date(projectedDate.getTime() + duration);
            projectedLegacyOccurrences.push({
              id: `${appt.id}-projected-${weekOffset}`,
              start: projectedDate,
              end: projectedEnd
            });
          }
        }
      }
      
      console.log('📅 Proyecciones Legacy Generadas:', {
        total: projectedLegacyOccurrences.length,
        ejemplos: projectedLegacyOccurrences.slice(0, 3).map(p => ({
          start: format(p.start, 'yyyy-MM-dd HH:mm'),
          end: format(p.end, 'yyyy-MM-dd HH:mm')
        }))
      });

      // Combine regular appointments with projected legacy occurrences for conflict detection
      const combinedConflicts = [
        ...allAppointments.map(a => ({
          start_time: a.start_time,
          end_time: a.end_time,
          status: a.status
        })),
        ...projectedLegacyOccurrences.map(p => ({
          start_time: p.start.toISOString(),
          end_time: p.end.toISOString(),
          status: 'confirmed' as const
        }))
      ];
      
      console.log('📊 Conflictos Combinados (appointments + proyecciones legacy):', {
        appointmentsOriginales: allAppointments.length,
        proyeccionesLegacy: projectedLegacyOccurrences.length,
        totalConflictos: combinedConflicts.length
      });

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
          // Crear fecha local explícitamente para evitar problemas de timezone
          const [year, month, day] = dateStr.split('-').map(Number);
          const [hours, minutes, seconds] = timeStr.split(':').map(Number);
          slotStart = new Date(year, month - 1, day, hours, minutes || 0, seconds || 0);
          slotEnd = new Date(slotStart.getTime() + serviceDuration * 60_000);
        }

        // Construir objeto con datetime para la detección de conflictos
        const slotForBlock = {
          ...slot,
          slot_datetime_start: slotStart.toISOString(),
          slot_datetime_end: slotEnd.toISOString(),
        };
        const { isBlocked, reason } = shouldBlockSlot(slotForBlock, combinedConflicts);

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

      // PASO 3: Filtrar slots según antelación mínima
      const slotPreferences = (listingRes.data?.slot_preferences as any) || {};
      const minNoticeHours = Number(slotPreferences.minNoticeHours || 0);
      
      let filteredByNotice: WeeklySlot[] = weeklySlots;
      if (minNoticeHours > 0) {
        const threshold = new Date(Date.now() + minNoticeHours * 3600_000);
        console.log(`⏰ Aplicando filtro de antelación mínima: ${minNoticeHours}h (umbral: ${threshold.toISOString()})`);
        
        filteredByNotice = weeklySlots.filter(slot => {
          const slotStart = new Date(slot.date.getFullYear(), slot.date.getMonth(), slot.date.getDate(), 
            parseInt(slot.time.split(':')[0]), parseInt(slot.time.split(':')[1]));
          const isWithinNotice = slotStart >= threshold;
          
          if (!isWithinNotice) {
            console.log(`🚫 Slot filtrado por antelación: ${format(slot.date, 'yyyy-MM-dd')} ${slot.time}`);
          }
          
          return isWithinNotice;
        });
        
        console.log(`📊 Slots después de filtro de antelación: ${filteredByNotice.length}/${weeklySlots.length}`);
      }

      // PASO 4: Filtrar slots que puedan acomodar la duración completa del servicio con validación de contigüidad REAL
      const canAccommodateFullService = (slot: WeeklySlot, allSlots: WeeklySlot[], requiredDuration: number, slotSize: number): boolean => {
        const requiredSlots = Math.ceil(requiredDuration / slotSize);
        if (requiredSlots <= 1) return true; // Single slot always works
        
        // Find all slots for the same date
        const sameDate = allSlots.filter(s => 
          format(s.date, 'yyyy-MM-dd') === format(slot.date, 'yyyy-MM-dd') && s.isAvailable
        );
        
        // Sort by time
        const sortedSlots = sameDate.sort((a, b) => a.time.localeCompare(b.time));
        
        // Find the index of current slot
        const currentIndex = sortedSlots.findIndex(s => s.id === slot.id);
        if (currentIndex === -1) return false;
        
        // Helper to parse time string to minutes since midnight
        const timeToMinutes = (timeStr: string): number => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        // Check if we have enough consecutive available slots with REAL time contiguity
        for (let i = 0; i < requiredSlots; i++) {
          const currentSlot = sortedSlots[currentIndex + i];
          if (!currentSlot || !currentSlot.isAvailable) {
            console.log(`❌ Slot ${i} no disponible o no existe`);
            return false;
          }
          
          // Validate time contiguity: next slot must start exactly slotSize minutes after current
          if (i > 0) {
            const prevSlot = sortedSlots[currentIndex + i - 1];
            const prevTime = timeToMinutes(prevSlot.time);
            const currentTime = timeToMinutes(currentSlot.time);
            const expectedTime = prevTime + slotSize;
            
            if (currentTime !== expectedTime) {
              console.log(`❌ Gap detectado: ${prevSlot.time} → ${currentSlot.time} (esperado: ${Math.floor(expectedTime/60)}:${String(expectedTime%60).padStart(2,'0')})`);
              return false;
            }
          }
        }
        
        console.log(`✅ Slot ${slot.time} puede acomodar ${requiredSlots} slots consecutivos de ${slotSize}min`);
        return true;
      };

      // Filter slots that can accommodate the full service duration
      const accommodatableSlots = filteredByNotice.filter(slot => 
        canAccommodateFullService(slot, filteredByNotice, serviceDuration, 60) // Use the serviceDuration parameter
      );

      console.log(`📊 Slots que pueden acomodar duración completa: ${accommodatableSlots.length}/${filteredByNotice.length} (duración requerida: ${serviceDuration} min)`);

      // Solo usar slots que puedan acomodar el servicio completo
      const finalWeeklySlots: WeeklySlot[] = accommodatableSlots;

      // Calcular recomendación basada en adyacencia respecto a las reservas confirmadas + proyecciones legacy
      const apptStartMinutesByDate: Record<string, Set<number>> = {};
      const apptEndMinutesByDate: Record<string, Set<number>> = {};

      // Usar las citas confirmadas de la base de datos + proyecciones legacy
      const adjacentPool = combinedConflicts;
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
      for (const s of finalWeeklySlots) {
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

      const weeklySlotsWithRec: WeeklySlot[] = finalWeeklySlots.map(s => {
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
        antesTemporal: finalWeeklySlots.length,
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