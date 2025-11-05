import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { checkRecurringConflicts } from '@/utils/simplifiedRecurrenceUtils';
import { useAvailabilityContext } from '@/contexts/AvailabilityContext';

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  available: boolean; // Add for compatibility
  conflictReason?: string;
}

interface UseProviderAvailabilityProps {
  providerId: string;
  selectedDate?: Date;
  serviceDuration?: number;
  recurrence?: string;
  excludeAppointmentId?: string; // Para excluir la cita que se está reagendando
}

export const useProviderAvailability = ({ 
  providerId, 
  selectedDate, 
  serviceDuration = 60, 
  recurrence = 'none',
  excludeAppointmentId
}: UseProviderAvailabilityProps) => {
  const { subscribeToAvailabilityChanges } = useAvailabilityContext();
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshAvailability = useCallback(async () => {
    if (!providerId || !selectedDate) return;
    
    setIsRefreshing(true);
    try {
      const dayOfWeek = selectedDate.getDay();
      const targetDate = format(selectedDate, 'yyyy-MM-dd');
      
      console.log('Fetching availability for:', {
        providerId,
        date: targetDate,
        dayOfWeek,
        recurrence,
        serviceDuration
      });

      // 1. Obtener disponibilidad configurada del proveedor para este día
      const { data: providerAvailability, error: availabilityError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (availabilityError) {
        console.error('Error fetching provider availability:', availabilityError);
        return;
      }

      // Si no hay disponibilidad configurada, usar horario estándar de 8:00 a 18:00
      const workingHours = providerAvailability && providerAvailability.length > 0 
        ? providerAvailability 
        : [{ 
            id: 'default', 
            provider_id: providerId, 
            day_of_week: dayOfWeek, 
            start_time: '08:00:00', 
            end_time: '18:00:00', 
            is_active: true, 
            created_at: new Date().toISOString(), 
            updated_at: new Date().toISOString() 
          }];

      console.log('Working hours:', workingHours.length > 0 ? 'configured' : 'using default 8-18');

      // 2. Obtener slots del proveedor para esta fecha (incluyendo los bloqueados si estamos reagendando)
      let slotsQuery = supabase
        .from('provider_time_slots')
        .select('id, provider_id, listing_id, slot_date, start_time, end_time, slot_datetime_start, slot_datetime_end, is_available, is_reserved, recurring_blocked, recurring_rule_id, blocked_until, created_at, slot_type')
        .eq('provider_id', providerId)
        .eq('slot_date', targetDate);

      // Si estamos reagendando, incluir slots bloqueados por recurrencia que podrían liberarse
      if (excludeAppointmentId) {
        slotsQuery = slotsQuery.or('and(is_available.eq.true,is_reserved.eq.false),and(recurring_blocked.eq.true,is_reserved.eq.true)');
      } else {
        slotsQuery = slotsQuery.eq('is_available', true).eq('is_reserved', false);
      }

      const { data: timeSlots, error: slotsError } = await slotsQuery;

      if (slotsError) {
        console.error('Error fetching time slots:', slotsError);
      }

      // 3. Obtener citas existentes para esta fecha (excluyendo la que se está reagendando)
      let appointmentsQuery = supabase
        .from('appointments')
        .select('start_time, end_time, recurrence, status')
        .eq('provider_id', providerId)
        .gte('start_time', startOfDay(selectedDate).toISOString())
        .lte('start_time', endOfDay(selectedDate).toISOString())
        .in('status', ['pending', 'confirmed']);

      if (excludeAppointmentId) {
        appointmentsQuery = appointmentsQuery.neq('id', excludeAppointmentId);
      }

      const { data: existingAppointments, error: appointmentsError } = await appointmentsQuery;

      if (appointmentsError) {
        console.error('Error fetching existing appointments:', appointmentsError);
      }

      // 4. Obtener citas recurrentes y excepciones para validar disponibilidad
      const { data: recurringAppointments, error: recurringError } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, recurrence, client_id, provider_id, listing_id, status')
        .eq('provider_id', providerId)
        .in('recurrence', ['daily', 'weekly', 'biweekly', 'triweekly', 'monthly'])
        .in('status', ['pending', 'confirmed']);

      let exceptions: any[] = [];
      if (recurringAppointments && recurringAppointments.length > 0) {
        const appointmentIds = recurringAppointments.map(apt => apt.id);
        const { data: exceptionData } = await supabase
          .from('recurring_exceptions')
          .select('id, appointment_id, exception_date, action_type, new_start_time, new_end_time, notes, created_at, updated_at')
          .in('appointment_id', appointmentIds);
        exceptions = exceptionData || [];
      }

      // 5. Generar slots disponibles basados en la disponibilidad configurada (reflejo 1:1 de "Administrar disponibilidad")
      const slots: TimeSlot[] = [];

      // Normalizar helper
      const toHM = (t: string) => t.slice(0, 5); // HH:MM:SS -> HH:MM

      // 5.1 Construir intervalos de bloqueo por citas y por slots bloqueados/reservados
      const appointmentIntervals = (existingAppointments || []).map(ap => ({
        start: new Date(ap.start_time),
        end: new Date(ap.end_time),
      }));

      // Traer TODOS los provider_time_slots del día para usarlos solo como BLOQUEOS/RESERVAS
      const { data: providerDaySlots } = await supabase
        .from('provider_time_slots')
        .select('start_time, end_time, is_available, is_reserved, recurring_blocked')
        .eq('provider_id', providerId)
        .eq('slot_date', targetDate);

      const blockedIntervals = (providerDaySlots || [])
        .filter(s => s.is_reserved === true || s.recurring_blocked === true || s.is_available === false)
        .map(s => ({
          start: toHM(s.start_time),
          end: toHM(s.end_time)
        }));

      const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && aEnd > bStart;

      // 5.2 Generar slots a partir de la disponibilidad configurada, avanzando por serviceDuration
      const now = new Date();
      const serviceStep = Math.max(2, serviceDuration); // mínimo 2m para evitar bucles extraños

      workingHours.forEach(av => {
        const startStr = av.start_time as string | undefined;
        const endStr = av.end_time as string | undefined;
        if (!startStr || !endStr) return;

        const [sH, sM] = toHM(startStr).split(':').map(Number);
        const [eH, eM] = toHM(endStr).split(':').map(Number);

        // Construir límites de la ventana del día
        const windowStart = new Date(selectedDate);
        windowStart.setHours(sH, sM, 0, 0);
        const windowEnd = new Date(selectedDate);
        windowEnd.setHours(eH, eM, 0, 0);

        // Iterar por pasos de duración del servicio
        for (let t = new Date(windowStart); t.getTime() + serviceDuration * 60000 <= windowEnd.getTime(); t = new Date(t.getTime() + serviceStep * 60000)) {
          const slotStart = new Date(t);
          const slotEnd = new Date(t.getTime() + serviceDuration * 60000);

          // Mostrar solo a partir del momento actual cuando es hoy
          if (format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') && slotStart <= now) {
            continue;
          }

          // Bloqueos por provider_time_slots (bloqueado, reservado, recurrente)
          const isBlockedByProviderSlot = blockedIntervals.some(b => {
            const [bSH, bSM] = b.start.split(':').map(Number);
            const [bEH, bEM] = b.end.split(':').map(Number);
            const bStart = new Date(selectedDate);
            bStart.setHours(bSH, bSM, 0, 0);
            const bEnd = new Date(selectedDate);
            bEnd.setHours(bEH, bEM, 0, 0);
            return overlaps(slotStart, slotEnd, bStart, bEnd);
          });

          if (isBlockedByProviderSlot) {
            slots.push({ time: format(slotStart, 'HH:mm'), isAvailable: false, available: false, conflictReason: 'Bloqueado' });
            continue;
          }

          // Conflictos por citas existentes (pendientes/confirmadas)
          const isBusy = appointmentIntervals.some(iv => overlaps(slotStart, slotEnd, iv.start, iv.end));
          if (isBusy) {
            slots.push({ time: format(slotStart, 'HH:mm'), isAvailable: false, available: false, conflictReason: 'Horario ocupado' });
            continue;
          }

          // Conflictos con series recurrentes + excepciones
          const hasRecurringConflict = checkRecurringConflicts(
            recurringAppointments || [],
            exceptions.map(ex => ({ ...ex, action_type: ex.action_type as 'cancelled' | 'rescheduled' })),
            slotStart,
            slotEnd,
            excludeAppointmentId
          );

          if (hasRecurringConflict) {
            slots.push({ time: format(slotStart, 'HH:mm'), isAvailable: false, available: false, conflictReason: 'Conflicto con serie recurrente' });
            continue;
          }

          // Si pasó todos los filtros, el slot está disponible
          slots.push({ time: format(slotStart, 'HH:mm'), isAvailable: true, available: true });
        }
      });

      // Ordenar slots por hora
      slots.sort((a, b) => a.time.localeCompare(b.time));
      
      console.log('Generated availability slots:', slots.length, 'available:', slots.filter(s => s.available).length);
      setAvailableTimeSlots(slots);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing availability:', error);
      setAvailableTimeSlots([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [providerId, selectedDate, serviceDuration, recurrence, excludeAppointmentId]);

  useEffect(() => {
    if (providerId && selectedDate) {
      setIsLoading(true);
      refreshAvailability().finally(() => setIsLoading(false));
    }
  }, [providerId, selectedDate, refreshAvailability]);

  // Subscribe to availability changes for this provider
  useEffect(() => {
    if (!providerId) return;
    
    console.log('Suscribiendo a cambios de disponibilidad para proveedor:', providerId);
    
    const unsubscribe = subscribeToAvailabilityChanges(providerId, () => {
      console.log('Disponibilidad actualizada, refrescando slots...');
      refreshAvailability();
    });
    
    return unsubscribe;
  }, [providerId, subscribeToAvailabilityChanges, refreshAvailability]);

  // Suscripción en tiempo real a cambios en provider_availability
  useEffect(() => {
    if (!providerId) return;
    const channel = supabase
      .channel(`provider-availability-${providerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_availability', filter: `provider_id=eq.${providerId}` }, () => {
        console.log('Cambio en provider_availability detectado, refrescando slots...');
        refreshAvailability();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [providerId, refreshAvailability]);

  return {
    availableTimeSlots,
    isLoading,
    isRefreshing,
    lastUpdated,
    refreshAvailability
  };
};