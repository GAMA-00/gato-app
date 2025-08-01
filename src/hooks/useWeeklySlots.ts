import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeTo12Hour } from '@/utils/timeSlotUtils';
import { useAvailabilityContext } from '@/contexts/AvailabilityContext';

export interface WeeklySlot {
  id: string;
  date: Date;
  time: string;
  displayTime: string;
  period: 'AM' | 'PM';
  isAvailable: boolean;
  conflictReason?: string;
}

export interface WeeklySlotGroup {
  date: Date;
  dayName: string;
  dayNumber: number;
  dayMonth: string;
  slots: WeeklySlot[];
}

interface UseWeeklySlotsProps {
  providerId: string;
  listingId: string;
  serviceDuration: number;
  recurrence?: string;
  startDate?: Date;
  daysAhead?: number;
}

export const useWeeklySlots = ({
  providerId,
  listingId,
  serviceDuration,
  recurrence = 'once',
  startDate,
  daysAhead = 7
}: UseWeeklySlotsProps) => {
  const { subscribeToAvailabilityChanges } = useAvailabilityContext();
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingSlot, setIsValidatingSlot] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Stable cache for request deduplication
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastParamsRef = useRef<string>('');

  // Stable function to fetch slots - only recreated when essential params change
  const fetchWeeklySlots = useCallback(async () => {
    if (!providerId || !listingId || !serviceDuration) {
      return;
    }

    // Always use the provided startDate for the exact week being requested
    const today = startOfDay(new Date());
    const baseDate = startDate ? startOfDay(startDate) : today;
    const endDate = addDays(baseDate, daysAhead - 1); // Exact 7 days from baseDate
    const paramsSignature = `${providerId}-${listingId}-${serviceDuration}-${recurrence}-${format(baseDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
    
    // Prevent duplicate requests with same signature
    if (lastParamsRef.current === paramsSignature && !abortControllerRef.current?.signal.aborted) {
      console.log('⏭️ Evitando petición duplicada:', paramsSignature);
      return;
    }
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
        .gte('slot_date', format(baseDate, 'yyyy-MM-dd'))
        .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
        .order('slot_datetime_start');

      if (slotsError) throw slotsError;
      
      console.log('📊 Resultado de consulta timeSlots:', {
        totalSlots: timeSlots?.length || 0,
        primeros3Slots: timeSlots?.slice(0, 3),
        rangoFechas: timeSlots?.length > 0 ? {
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
        .lte('start_time', endDate.toISOString());

      if (appointmentsError) throw appointmentsError;

      // Process slots with proper timezone handling
      const weeklySlots: WeeklySlot[] = timeSlots?.map(slot => {
        // Use the slot_datetime_start directly instead of reconstructing the date
        const slotStart = new Date(slot.slot_datetime_start);
        const slotEnd = new Date(slot.slot_datetime_end);
        
        // Create a date object for the slot date (used for grouping)
        const slotDate = new Date(slotStart);
        
        // For now, we rely on the database's is_available field
        // The provider slot preferences are handled at the database level during slot generation
        const isManuallyDisabled = !slot.is_available;
        
        // Check conflicts
        const hasDirectConflict = conflictingAppointments?.some(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return slotStart < aptEnd && slotEnd > aptStart;
        }) || false;

        const { time: displayTime, period } = formatTimeTo12Hour(slot.start_time);

        // Slot is available only if it's not manually disabled and has no conflicts
        const isSlotAvailable = !isManuallyDisabled && !hasDirectConflict;
        
        let conflictReason: string | undefined;
        if (isManuallyDisabled) {
          conflictReason = 'Horario no disponible';
        } else if (hasDirectConflict) {
          conflictReason = 'Horario ocupado';
        }

        console.log(`Slot procesado: ${slot.slot_date} ${slot.start_time} -> ${displayTime} ${period} (disponible: ${isSlotAvailable}, deshabilitado: ${isManuallyDisabled})`);

        return {
          id: slot.id,
          date: slotDate,
          time: slot.start_time,
          displayTime,
          period,
          isAvailable: isSlotAvailable,
          conflictReason
        };
      }) || [];
      
      setSlots(weeklySlots);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching slots:', err);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, listingId, serviceDuration, recurrence]); // Stable dependencies only

  // Simplified validation for recurring slots - optimistic approach
  const validateSlot = async (slot: WeeklySlot): Promise<boolean> => {
    // For immediate booking flow, always return true to avoid blocking UX
    // Validation will happen at booking creation time
    console.log(`📋 Validación optimista para slot: ${slot.time} (recurrencia: ${recurrence})`);
    return true;
  };

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

  // Group slots by date for easier rendering
  const slotGroups = useMemo((): WeeklySlotGroup[] => {
    const grouped: Record<string, WeeklySlot[]> = {};
    
    slots.forEach(slot => {
      const dateKey = format(slot.date, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(slot);
    });

    return Object.entries(grouped)
      .map(([dateKey, daySlots]) => {
        const date = daySlots[0].date;
        return {
          date,
          dayName: format(date, 'EEEE'),
          dayNumber: date.getDate(),
          dayMonth: format(date, 'MMM'),
          slots: daySlots.sort((a, b) => a.time.localeCompare(b.time))
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [slots]);

  // Filter to show only days with available slots
  const availableSlotGroups = useMemo(() => {
    return slotGroups.filter(group => 
      group.slots.some(slot => slot.isAvailable)
    );
  }, [slotGroups]);

  const stats = useMemo(() => {
    const totalSlots = slots.length;
    const availableSlots = slots.filter(slot => slot.isAvailable).length;
    const daysWithSlots = slotGroups.length;
    const daysWithAvailableSlots = availableSlotGroups.length;

    return {
      totalSlots,
      availableSlots,
      daysWithSlots,
      daysWithAvailableSlots,
      availabilityRate: totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0
    };
  }, [slots, slotGroups, availableSlotGroups]);

  // Effect to trigger fetch when essential params change
  useEffect(() => {
    if (providerId && listingId && serviceDuration > 0) {
      const timer = setTimeout(() => {
        fetchWeeklySlots();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [providerId, listingId, serviceDuration, recurrence, startDate?.getTime(), daysAhead, fetchWeeklySlots]);

  // Subscribe to availability changes for this provider
  useEffect(() => {
    if (!providerId) return;
    
    console.log('WeeklySlots: Suscribiendo a cambios de disponibilidad para proveedor:', providerId);
    
    const unsubscribe = subscribeToAvailabilityChanges(providerId, () => {
      console.log('WeeklySlots: Disponibilidad actualizada, refrescando slots...');
      console.log('WeeklySlots: Ejecutando refreshSlots para providerId:', providerId);
      
      // Clear cache and force immediate refresh
      lastParamsRef.current = '';
      
      // Add small delay to ensure database changes are propagated
      setTimeout(() => {
        refreshSlots();
      }, 1000);
    });
    
    return unsubscribe;
  }, [providerId, subscribeToAvailabilityChanges, refreshSlots]);

  // Subscribe to real-time changes in provider_time_slots
  useEffect(() => {
    if (!providerId || !listingId) return;

    console.log('WeeklySlots: Configurando suscripción en tiempo real para slots del proveedor:', providerId);

    const channel = supabase
      .channel('provider-time-slots-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'provider_time_slots',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('WeeklySlots: Cambio detectado en provider_time_slots:', payload);
          
          // Only refresh if it affects the current listing
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            console.log('WeeklySlots: Cambio relevante para listing actual, refrescando...');
            setTimeout(() => {
              refreshSlots();
            }, 500);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'provider_availability',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('WeeklySlots: Cambio detectado en provider_availability:', payload);
          setTimeout(() => {
            refreshSlots();
          }, 1500); // Longer delay for availability changes as they trigger slot regeneration
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_slot_preferences',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          console.log('WeeklySlots: Cambio detectado en provider_slot_preferences:', payload);
          
          // Only refresh if it affects the current listing
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord?.listing_id === listingId || oldRecord?.listing_id === listingId) {
            console.log('WeeklySlots: Cambio relevante en preferencias de slots, refrescando...');
            setTimeout(() => {
              refreshSlots();
            }, 300);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('WeeklySlots: Cancelando suscripción en tiempo real');
      supabase.removeChannel(channel);
    };
  }, [providerId, listingId, refreshSlots]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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