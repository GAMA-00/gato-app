import { useState, useCallback, useRef, useEffect } from 'react';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeTo12Hour } from '@/utils/timeSlotUtils';
import { WeeklySlot, UseWeeklySlotsProps } from '@/lib/weeklySlotTypes';
import { createSlotSignature, shouldBlockSlot } from '@/utils/weeklySlotUtils';
import { ensureAllSlotsExist } from '@/utils/slotRegenerationUtils';
import { generateAvailabilitySlots } from '@/utils/availabilitySlotGenerator';
import { DATE_CONFIG } from '@/lib/recurrence/config';


interface UseProviderSlotManagementReturn {
  slots: WeeklySlot[];
  isLoading: boolean;
  lastUpdated: Date | null;
  fetchSlots: () => Promise<void>;
  refreshSlots: () => void;
}

export const useProviderSlotManagement = ({
  providerId,
  listingId,
  serviceDuration,
  startDate,
  daysAhead = 7
}: Omit<UseWeeklySlotsProps, 'recurrence'>): UseProviderSlotManagementReturn => {
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Stable cache for request deduplication
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<string>('');
  
  // Real-time subscription management
  const subscriptionRef = useRef<any>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch ALL slots (available and blocked) for provider management
  const fetchSlots = useCallback(async () => {
    if (!providerId || !listingId || !serviceDuration) {
      return;
    }

    const today = startOfDay(new Date());
    const baseDate = startDate ? startOfDay(startDate) : today;
    // Usar exactamente las fechas de inicio y fin de la semana, sin agregar días extra
    const endDate = startOfDay(addDays(baseDate, daysAhead - 1));
    const paramsSignature = createSlotSignature(providerId, listingId, serviceDuration, 'admin', baseDate, endDate);
    
    // Prevent duplicate requests
    if (lastParamsRef.current === paramsSignature) {
      console.log('⏭️ Evitando petición duplicada (admin):', paramsSignature);
      return;
    }
    
    console.log('🚀 Nueva petición admin con firma:', paramsSignature);
    lastParamsRef.current = paramsSignature;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    
    console.log('=== PROVIDER SLOT MANAGEMENT DEBUG ===');
    console.log('Parámetros de consulta (TODOS los slots):', {
      providerId,
      listingId,
      serviceDuration,
      baseDate: format(baseDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      daysAhead
    });
    
    try {
      // Primero obtener la disponibilidad configurada del proveedor
      const { data: availability, error: availError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (availError) throw availError;

      console.log('📋 Disponibilidad configurada:', availability);

      // Fetch ALL existing time slots (available and blocked)
      const { data: timeSlots, error: slotsError } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', providerId)
        .eq('listing_id', listingId)
        .gte('slot_date', format(baseDate, 'yyyy-MM-dd'))
        .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
        .order('slot_datetime_start');

      if (slotsError) throw slotsError;
      
      // Fetch recurring appointment INSTANCES for this provider/listing
      let recurringInstanceIntervals: { id: string; start: Date; end: Date }[] = [];
      try {
        const endDateFull = endOfDay(endDate);
        
        // 1️⃣ Fetch active recurring rules to get canonical start times
        const { data: rules, error: rulesError } = await supabase
          .from('recurring_rules')
          .select('id, start_time, is_active')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .eq('is_active', true);

        if (rulesError) {
          console.warn('⚠️ Error cargando reglas recurrentes:', rulesError);
        }

        // Build set of canonical start times (HH:mm)
        const canonicalStarts = new Set(
          (rules || [])
            .map(r => (r.start_time || '').slice(0, 5)) // Extract HH:mm
            .filter(Boolean)
        );

        // 2️⃣ Fetch recurring instances
        const { data: recurringInstances, error: instancesError } = await supabase
          .from('recurring_appointment_instances')
          .select('id, start_time, end_time, status, recurring_rules(provider_id, listing_id)')
          .eq('recurring_rules.provider_id', providerId)
          .eq('recurring_rules.listing_id', listingId)
          .in('status', ['scheduled', 'confirmed'])
          .gte('start_time', baseDate.toISOString())
          .lte('start_time', endDateFull.toISOString());

        if (instancesError) {
          console.warn('⚠️ Error cargando instancias recurrentes:', instancesError);
        }

        // 3️⃣ On-demand materialization: if no instances but rules exist, generate them
        let instancesData = recurringInstances || [];
        if (instancesData.length === 0 && (rules || []).length > 0) {
          console.log('📦 No hay instancias materializadas, generando para', rules?.length, 'reglas...');
          
          // Calculate weeks ahead based on date range
          const weeksAhead = Math.ceil((endDateFull.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 2;
          
          // Generate instances for each rule
          for (const rule of rules || []) {
            try {
              const { error: rpcError } = await supabase.rpc('generate_recurring_appointment_instances', {
                p_rule_id: rule.id,
                p_weeks_ahead: weeksAhead
              });
              
              if (rpcError) {
                console.warn('⚠️ Error generando instancias para regla', rule.id, rpcError);
              } else {
                console.log('✅ Instancias generadas para regla', rule.id);
              }
            } catch (err) {
              console.warn('⚠️ Excepción generando instancias:', err);
            }
          }
          
          // Re-query instances after materialization
          const { data: newInstances, error: newError } = await supabase
            .from('recurring_appointment_instances')
            .select('id, start_time, end_time, status, recurring_rules(provider_id, listing_id)')
            .gte('start_time', startDate.toISOString())
            .lte('end_time', endDateFull.toISOString())
            .in('status', ['scheduled', 'confirmed'])
            .not('recurring_rules', 'is', null);
          
          if (newError) {
            console.warn('⚠️ Error recargando instancias:', newError);
          } else {
            instancesData = newInstances || [];
            console.log('🔄 Instancias recargadas:', instancesData.length);
          }
        }

        if (instancesData.length > 0) {
          // 4️⃣ Group instances by local date (America/Costa_Rica)
          const grouped = new Map<string, any[]>();
          instancesData.forEach(inst => {
            const start = new Date(inst.start_time);
            const dateKey = formatInTimeZone(start, DATE_CONFIG.DEFAULT_TIMEZONE, 'yyyy-MM-dd');
            const localHHmm = formatInTimeZone(start, DATE_CONFIG.DEFAULT_TIMEZONE, 'HH:mm');
            const arr = grouped.get(dateKey) || [];
            arr.push({ ...inst, __localHHmm: localHHmm, __start: start, __end: new Date(inst.end_time) });
            grouped.set(dateKey, arr);
          });

          // 5️⃣ Filter instances: keep only canonical times if they exist, otherwise keep all (for rescheduled)
          const filteredInstances: any[] = [];
          for (const [dateKey, arr] of grouped.entries()) {
            // Check if any instances match canonical times
            const canonicalArr = arr.filter(i => canonicalStarts.has(i.__localHHmm));
            
            // If we found canonical instances for this date, use only those; otherwise use all (for exceptions)
            const pick = canonicalArr.length > 0 ? canonicalArr : arr;
            
            // Deduplicate by local HH:mm to avoid precision duplicates
            const uniq = new Map<string, any>();
            pick.forEach(i => {
              if (!uniq.has(i.__localHHmm)) {
                uniq.set(i.__localHHmm, i);
              }
            });
            
            filteredInstances.push(...uniq.values());
          }

          console.log('🔎 Recurring instances (raw vs filtered):', {
            raw: instancesData.length,
            filtered: filteredInstances.length,
            canonical: Array.from(canonicalStarts),
            groupedDates: grouped.size
          });

          // 6️⃣ Build intervals from filtered instances
          recurringInstanceIntervals = filteredInstances.map(inst => ({
            id: inst.id,
            start: inst.__start,
            end: inst.__end
          }));
          
          console.log('🔮 Instancias recurrentes finales:', {
            total: recurringInstanceIntervals.length,
            primeros3: recurringInstanceIntervals.slice(0, 3)
          });
        }
      } catch (e) {
        console.warn('⚠️ Error cargando instancias recurrentes:', e);
      }
      
      console.log('📊 Resultado consulta ALL slots (admin):', {
        totalSlots: timeSlots?.length || 0,
        disponibles: timeSlots?.filter(s => s.is_available)?.length || 0,
        bloqueados: timeSlots?.filter(s => !s.is_available)?.length || 0,
        fechasEncontradas: [...new Set(timeSlots?.map(s => s.slot_date))],
        primeros3Slots: timeSlots?.slice(0, 3)
      });

      // ⛔ CRITICAL FIX: Fetch = read-only, never write during fetch
      // The ensureAllSlotsExist call was causing slots to disappear due to
      // its delete logic. Now we ONLY read existing slots.
      // Slot regeneration should only happen via explicit admin action or server-side RPC.
      
      let finalTimeSlots = timeSlots || [];
      
      console.log('✅ [READ-ONLY MODE] Usando slots existentes de la base de datos');
      console.log('📊 Slots disponibles:', {
        totalSlots: finalTimeSlots.length,
        disponibles: finalTimeSlots.filter(s => s.is_available)?.length || 0,
        bloqueados: finalTimeSlots.filter(s => !s.is_available)?.length || 0,
        fechasDistintas: [...new Set(finalTimeSlots.map(s => s.slot_date))]
      });
      
      // If there are genuinely NO slots and we have availability configured,
      // trigger regeneration via RPC (server-side, safer) - but ONLY for empty case
      const hasSlotsForRange = finalTimeSlots.length > 0;
      const hasAvailability = (availability || []).some(a => a.is_active);
      
      if (!hasSlotsForRange && hasAvailability) {
        console.log('⚠️ No hay slots pero sí hay disponibilidad configurada. Considere regenerar slots manualmente.');
        // NOTE: We no longer auto-regenerate here to prevent data corruption
        // The provider should use an explicit "regenerate slots" action if needed
      }

      // Use final time slots directly without adding virtual duplicates
      // The regeneration already ensures all needed slots exist in the database
      const uiSlots = finalTimeSlots || [];
      
      console.log('📊 Slots finales para UI (sin duplicados):', {
        totalSlots: uiSlots.length,
        disponibles: uiSlots.filter(s => s.is_available)?.length || 0,
        bloqueados: uiSlots.filter(s => !s.is_available)?.length || 0,
        fechasDistintas: [...new Set(uiSlots.map(s => s.slot_date))]
      });

      // Fetch ALL appointments (pending and confirmed) within the date range for conflict detection
      let allAppointments: any[] = [];
      let legacyRecurringAppointments: any[] = [];
      
      try {
        const endDateFull = endOfDay(endDate);
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .in('status', ['pending', 'confirmed'])
          .gte('start_time', baseDate.toISOString())
          .lte('start_time', endDateFull.toISOString());

        if (appointmentsError) {
          console.warn('⚠️ No se pudieron cargar citas:', appointmentsError);
        } else {
          allAppointments = appointments || [];
          console.log(`📅 Citas encontradas para análisis de conflictos:`, {
            total: allAppointments.length,
            confirmed: allAppointments.filter(a => a.status === 'confirmed').length,
            pending: allAppointments.filter(a => a.status === 'pending').length,
            recurring: allAppointments.filter(a => a.recurrence && a.recurrence !== 'none').length
          });
        }
        
        // 🔄 LEGACY SYSTEM: Fetch confirmed appointments with recurrence (even if outside date range)
        // We need to project their future occurrences into our viewing window
        const { data: legacyRecurring, error: legacyError } = await supabase
          .from('appointments')
          .select('*')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .eq('status', 'confirmed')
          .not('recurrence', 'is', null)
          .neq('recurrence', 'none');
        
        if (legacyError) {
          console.warn('⚠️ Error cargando citas legacy recurrentes:', legacyError);
        } else {
          legacyRecurringAppointments = legacyRecurring || [];
          console.log(`🔄 Citas legacy con recurrencia encontradas:`, {
            total: legacyRecurringAppointments.length,
            weekly: legacyRecurringAppointments.filter(a => a.recurrence === 'weekly').length,
            biweekly: legacyRecurringAppointments.filter(a => a.recurrence === 'biweekly').length,
            monthly: legacyRecurringAppointments.filter(a => a.recurrence === 'monthly').length
          });
        }
      } catch (e) {
        console.warn('⚠️ Error cargando citas para conflictos', e);
      }
      
      // 🔮 PROJECT LEGACY RECURRING APPOINTMENTS: Calculate future occurrences
      const projectedLegacyOccurrences: { id: string; start: Date; end: Date; appointmentId: string }[] = [];
      
      if (legacyRecurringAppointments.length > 0) {
        console.log('🔮 Proyectando ocurrencias futuras de citas legacy...');
        
        for (const apt of legacyRecurringAppointments) {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          const duration = aptEnd.getTime() - aptStart.getTime();
          
          // Calculate day of week for the original appointment
          const originalDayOfWeek = aptStart.getUTCDay();
          
          // Project occurrences for the next 8 weeks from the viewing window start
          let currentDate = new Date(baseDate);
          const projectionEndDate = addDays(baseDate, daysAhead + 7 * 7); // 8 weeks ahead
          
          while (currentDate <= projectionEndDate) {
            const currentDayOfWeek = currentDate.getUTCDay();
            
            // Check if this date matches the recurrence pattern
            let shouldProject = false;
            
            if (apt.recurrence === 'weekly' && currentDayOfWeek === originalDayOfWeek) {
              shouldProject = true;
            } else if (apt.recurrence === 'biweekly' && currentDayOfWeek === originalDayOfWeek) {
              // Check if it's been 2 weeks since the original
              const weeksSince = Math.floor((currentDate.getTime() - aptStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
              shouldProject = weeksSince % 2 === 0;
            } else if (apt.recurrence === 'monthly' && currentDate.getUTCDate() === aptStart.getUTCDate()) {
              shouldProject = true;
            }
            
            if (shouldProject && currentDate >= baseDate) {
              // Create projected occurrence with same time of day as original
              const projectedStart = new Date(Date.UTC(
                currentDate.getUTCFullYear(),
                currentDate.getUTCMonth(),
                currentDate.getUTCDate(),
                aptStart.getUTCHours(),
                aptStart.getUTCMinutes(),
                0
              ));
              const projectedEnd = new Date(projectedStart.getTime() + duration);
              
              projectedLegacyOccurrences.push({
                id: `legacy-${apt.id}-${format(projectedStart, 'yyyy-MM-dd-HHmm')}`,
                start: projectedStart,
                end: projectedEnd,
                appointmentId: apt.id
              });
            }
            
            currentDate = addDays(currentDate, 1);
          }
        }
        
        console.log('🔮 Ocurrencias legacy proyectadas:', {
          total: projectedLegacyOccurrences.length,
          primeros3: projectedLegacyOccurrences.slice(0, 3).map(o => ({
            start: o.start.toISOString(),
            end: o.end.toISOString()
          }))
        });
      }
      
      // 🔗 COMBINE: Merge new system instances with legacy projections
      const combinedRecurringIntervals = [
        ...recurringInstanceIntervals,
        ...projectedLegacyOccurrences
      ];
      
      console.log('🔗 Intervalos recurrentes combinados:', {
        nuevasSistema: recurringInstanceIntervals.length,
        legacyProyectadas: projectedLegacyOccurrences.length,
        totalCombinado: combinedRecurringIntervals.length
      });

      // Process ALL slots and determine availability based on ACTUAL appointment conflicts
      const providerSlots: WeeklySlot[] = (uiSlots || []).map((slot: any) => {
        const slotStart = new Date(slot.slot_datetime_start);
        const slotEnd = new Date(slot.slot_datetime_end);
        const slotDate = new Date(slotStart);

        const { time: displayTime, period } = formatTimeTo12Hour(slot.start_time);

        // Check if this slot matches any recurring instances (new system + legacy projections)
        const matchesRecurringInstance = combinedRecurringIntervals.some(inst =>
          slotStart < inst.end && slotEnd > inst.start
        );
        
        // Use shouldBlockSlot utility to determine true availability and conflict reason
        const slotBlockStatus = shouldBlockSlot(slot, allAppointments);
        
        // Determine final blocking status
        // Priority: combined recurring intervals (new + legacy) > regular appointment conflicts
        let finalBlocked = slotBlockStatus.isBlocked;
        let finalReason = slotBlockStatus.reason;
        let isRecurringSlot = false;
        
        if (matchesRecurringInstance) {
          // This slot is blocked by a recurring appointment (new system or legacy projection)
          finalBlocked = true;
          finalReason = 'Bloqueado por cita recurrente';
          isRecurringSlot = true;
        }
        
        // Calculate effective availability
        const effectiveAvailability = !finalBlocked;
        
        // Log recurring slots for debugging
        if (isRecurringSlot) {
          console.log(`🔄 Slot recurrente detectado en ${slot.slot_datetime_start} (nuevo sistema o legacy proyectado)`);
        }

        return {
          id: slot.id || `virtual-${format(slotDate, 'yyyy-MM-dd')}-${slot.start_time}`,
          date: slotDate,
          time: slot.start_time,
          displayTime,
          period,
          isAvailable: effectiveAvailability,
          conflictReason: finalBlocked ? finalReason : undefined,
          isRecurringProjection: isRecurringSlot
        };
      });
      
      setSlots(providerSlots);
      setLastUpdated(new Date());
      
    } catch (err) {
      // Check if this is an abort error (expected during navigation/refresh)
      const isAbortError = err instanceof DOMException && err.name === 'AbortError';
      
      if (isAbortError) {
        console.log('⏭️ Petición abortada (esperado durante refresh) - manteniendo estado anterior');
        // Do NOT clear slots - keep previous state
        return;
      }
      
      console.error('Error fetching admin slots:', err);
      // CRITICAL FIX: Do NOT call setSlots([]) on error
      // This was causing all slots to disappear when a single slot was toggled
      // Keep the previous state to avoid UI collapse
    } finally {
      setIsLoading(false);
    }
  }, [providerId, listingId, serviceDuration, startDate, daysAhead]);

  // Create a stable refresh function
  const refreshSlots = useCallback(() => {
    console.log('ProviderSlotManagement: Forzando actualización manual');
    lastParamsRef.current = ''; // Clear cache to force refresh
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Trigger immediate fetch
    fetchSlots();
  }, [fetchSlots]);

  // Auto-fetch slots when parameters change
  useEffect(() => {
    if (providerId && listingId && serviceDuration > 0) {
      console.log('🔄 [ProviderSlotManagement] Disparando fetch por cambio de parámetros:', {
        startDate: startDate ? startDate.toISOString().split('T')[0] : 'today',
        providerId,
        listingId,
        serviceDuration
      });
      
      const timer = setTimeout(() => {
        fetchSlots();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [providerId, listingId, serviceDuration, startDate?.getTime(), fetchSlots]);

  // Real-time subscription for slot changes
  useEffect(() => {
    if (!providerId || !listingId) return;

    console.log('🔗 Configurando suscripción en tiempo real para slots del proveedor');
    
    // Cleanup previous subscription
    if (subscriptionRef.current) {
      console.log('🧹 Limpiando suscripción previa');
      supabase.removeChannel(subscriptionRef.current);
    }

    // Debounced refresh function to avoid too many calls
    const debouncedRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        console.log('🔄 Actualizando slots por cambio en tiempo real');
        refreshSlots();
      }, 500);
    };

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`provider-slots-${providerId}-${listingId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'provider_time_slots',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('📡 Cambio detectado en provider_time_slots:', payload);
          // Only refresh if it's for our listing
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            debouncedRefresh();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all appointment events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'appointments',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('📡 Cambio detectado en appointments:', payload);
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Check if this appointment affects our listing
          const affectsOurListing = (newRecord?.listing_id === listingId) || (oldRecord?.listing_id === listingId);
          
          if (affectsOurListing) {
            console.log('🔄 Cambio en appointment que afecta nuestro listing - actualizando disponibilidad');
            
            // Shorter refresh delay for appointment changes to ensure UI is responsive
            setTimeout(() => {
              refreshSlots();
            }, 200);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_rules',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('📡 Cambio detectado en recurring_rules:', payload);
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            console.log('🔄 Regla recurrente modificada - actualizando disponibilidad');
            debouncedRefresh();
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      console.log('🧹 Limpiando suscripción en tiempo real');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [providerId, listingId, refreshSlots]);

  return {
    slots,
    isLoading,
    lastUpdated,
    fetchSlots,
    refreshSlots
  };
};