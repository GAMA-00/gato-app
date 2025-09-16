import { useState, useCallback, useRef, useEffect } from 'react';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeTo12Hour } from '@/utils/timeSlotUtils';
import { WeeklySlot, UseWeeklySlotsProps } from '@/lib/weeklySlotTypes';
import { createSlotSignature } from '@/utils/weeklySlotUtils';
import { ensureAllSlotsExist } from '@/utils/slotRegenerationUtils';
import { generateAvailabilitySlots } from '@/utils/availabilitySlotGenerator';

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
      
      console.log('📊 Resultado consulta ALL slots (admin):', {
        totalSlots: timeSlots?.length || 0,
        disponibles: timeSlots?.filter(s => s.is_available)?.length || 0,
        bloqueados: timeSlots?.filter(s => !s.is_available)?.length || 0,
        fechasEncontradas: [...new Set(timeSlots?.map(s => s.slot_date))],
        primeros3Slots: timeSlots?.slice(0, 3)
      });

      // Verificar si faltan slots y regenerarlos si es necesario
      let finalTimeSlots = timeSlots;
      try {
        // Forzar regeneración para garantizar consistencia con la configuración de disponibilidad
        console.log('🔧 Ejecutando regeneración de slots para garantizar consistencia...');
        await ensureAllSlotsExist(providerId, listingId, baseDate, endDate, availability || [], timeSlots || [], serviceDuration);

        // Volver a consultar después de la regeneración
        const { data: refreshedSlots, error: finalSlotsError } = await supabase
          .from('provider_time_slots')
          .select('*')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .gte('slot_date', format(baseDate, 'yyyy-MM-dd'))
          .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
          .order('slot_datetime_start');

        if (finalSlotsError) throw finalSlotsError;
        finalTimeSlots = refreshedSlots;
        
        console.log('📊 Slots después de regeneración:', {
          totalSlots: finalTimeSlots?.length || 0,
          disponibles: finalTimeSlots?.filter(s => s.is_available)?.length || 0,
          bloqueados: finalTimeSlots?.filter(s => !s.is_available)?.length || 0
        });
      } catch (regenerationError) {
        console.error('⚠️ Error en regeneración de slots, usando slots existentes:', regenerationError);
        // Usar slots existentes si la regeneración falla para mantener la UI funcional
        finalTimeSlots = timeSlots;
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

      // Buscar citas recurrentes que se traslapen con la ventana actual
      let recurringIntervals: Array<{ start: Date; end: Date }> = [];
      try {
        const endDateFull = endOfDay(endDate);
        const { data: recurringAppointments, error: recurringError } = await supabase
          .from('appointments')
          .select('start_time, end_time, recurrence, recurring_rule_id, is_recurring_instance, status')
          .eq('provider_id', providerId)
          .eq('listing_id', listingId)
          .in('status', ['pending', 'confirmed'])
          .gte('start_time', baseDate.toISOString())
          .lte('start_time', endDateFull.toISOString())
          .or('recurrence.neq.none,recurring_rule_id.not.is.null,is_recurring_instance.eq.true');

        if (recurringError) {
          console.warn('⚠️ No se pudieron cargar citas recurrentes:', recurringError);
        } else {
          recurringIntervals = (recurringAppointments || []).map(app => ({
            start: new Date(app.start_time),
            end: new Date(app.end_time)
          }));
          console.log(`🔁 Intervalos recurrentes detectados: ${recurringIntervals.length}`);
        }
      } catch (e) {
        console.warn('⚠️ Error preparando intervalos recurrentes', e);
      }

      // Procesar TODOS los slots y etiquetar correctamente el tipo de bloqueo
      const providerSlots: WeeklySlot[] = (uiSlots || []).map((slot: any) => {
        const slotStart = new Date(slot.slot_datetime_start);
        const slotEnd = new Date(slot.slot_datetime_end);
        const slotDate = new Date(slotStart);

        const { time: displayTime, period } = formatTimeTo12Hour(slot.start_time);

        // Determinar el motivo del bloqueo de manera más precisa
        let conflictReason: string | undefined;
        if (!slot.is_available) {
          const isRecurringDB = Boolean(slot.recurring_blocked) || Boolean(slot.recurring_rule_id);
          const overlapsRecurring = recurringIntervals.some(({ start, end }) => slotStart < end && slotEnd > start);

          if (isRecurringDB || overlapsRecurring) {
            conflictReason = 'Bloqueado por cita recurrente';
          } else if (slot.is_reserved && slot.slot_type === 'reserved') {
            conflictReason = 'Reservado por cliente';
          } else if (slot.slot_type === 'manually_blocked') {
            conflictReason = 'Bloqueado manualmente';
          } else {
            conflictReason = 'No disponible';
          }
        }

        return {
          id: slot.id || `virtual-${format(slotDate, 'yyyy-MM-dd')}-${slot.start_time}`,
          date: slotDate,
          time: slot.start_time,
          displayTime,
          period,
          isAvailable: slot.is_available,
          conflictReason
        };
      });
      
      setSlots(providerSlots);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching admin slots:', err);
      setSlots([]);
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
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('📡 Cambio detectado en appointments:', payload);
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Check if this is a recurring appointment cancellation
          const wasRecurring = oldRecord?.recurrence !== 'none' || oldRecord?.recurring_rule_id || oldRecord?.is_recurring_instance;
          const isCancelled = newRecord?.status === 'cancelled';
          const statusChanged = oldRecord?.status !== newRecord?.status;
          
          if (wasRecurring && isCancelled && statusChanged && newRecord?.listing_id === listingId) {
            console.log('🔄 Cita recurrente cancelada - actualizando disponibilidad');
            // Immediate refresh for cancelled recurring appointments
            setTimeout(() => {
              refreshSlots();
            }, 100);
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