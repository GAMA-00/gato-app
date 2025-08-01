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
        .in('recurrence', ['weekly', 'biweekly', 'triweekly', 'monthly'])
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

      // 5. Generar slots disponibles basados en la disponibilidad configurada
      const slots: TimeSlot[] = [];
      const blockedTimes = new Set<string>();

      // Marcar horarios bloqueados por citas existentes
      existingAppointments?.forEach(appointment => {
        const startTime = new Date(appointment.start_time);
        const endTime = new Date(appointment.end_time);
        const startHour = startTime.getHours();
        const startMinute = startTime.getMinutes();
        const endHour = endTime.getHours();
        const endMinute = endTime.getMinutes();
        
        // Bloquear el rango de tiempo ocupado
        for (let hour = startHour; hour <= endHour; hour++) {
          const timeKey = `${hour.toString().padStart(2, '0')}:${hour === startHour ? startMinute.toString().padStart(2, '0') : '00'}`;
          if (hour === endHour && endMinute === 0) break; // No bloquear la hora exacta de fin si termina en :00
          blockedTimes.add(timeKey);
        }
      });


      // 6. Generar slots basados en disponibilidad o usar slots existentes
      if (timeSlots && timeSlots.length > 0) {
        // Usar slots específicos del proveedor
        timeSlots.forEach(slot => {
          const timeKey = slot.start_time;
          let isAvailable = true;
          let conflictReason: string | undefined;

          // Verificar si está bloqueado por citas existentes
          if (blockedTimes.has(timeKey)) {
            isAvailable = false;
            conflictReason = 'Horario ocupado';
          }
          // Si está bloqueado por recurrencia, verificar si podemos liberarlo
          else if (slot.recurring_blocked && excludeAppointmentId) {
            // Check if this slot is blocked by the appointment being rescheduled
            // Note: We need to query the recurring_rule_id from appointments table
            const currentAppointment = recurringAppointments?.find(apt => apt.id === excludeAppointmentId);
            const isBlockedBySameAppointment = slot.recurring_rule_id && 
              currentAppointment && 
              slot.recurring_rule_id === currentAppointment.id; // Using appointment id as rule reference
            
            if (isBlockedBySameAppointment) {
              // Check if there's an exception that would make this slot available
              const slotDateTime = new Date(selectedDate);
              const [hours, minutes] = timeKey.split(':').map(Number);
              slotDateTime.setHours(hours, minutes, 0, 0);
              
              const hasException = exceptions.some(ex => 
                ex.appointment_id === excludeAppointmentId &&
                new Date(ex.exception_date).toDateString() === selectedDate.toDateString()
              );
              
              isAvailable = !hasException; // Available if no exception exists
              conflictReason = hasException ? 'Horario ya tiene excepción' : undefined;
            } else {
              isAvailable = false;
              conflictReason = 'Bloqueado por otra serie recurrente';
            }
          }
          
          slots.push({
            time: timeKey,
            isAvailable,
            available: isAvailable,
            conflictReason
          });
        });
      } else {
        // Generar slots basados en disponibilidad general
        workingHours.forEach(availability => {
          const startTime = availability.start_time;
          const endTime = availability.end_time;
          
          if (startTime && endTime) {
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            
            // Generar slots cada hora dentro del rango
            for (let hour = startHour; hour < endHour; hour++) {
              for (let minute = 0; minute < 60; minute += 60) { // Solo cada hora por ahora
                const timeKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                let isAvailable = true;
                let conflictReason: string | undefined;
                
                // Verificar conflictos
                if (blockedTimes.has(timeKey)) {
                  isAvailable = false;
                  conflictReason = 'Horario ocupado';
                } else if (recurringAppointments) {
                  // Check for recurring conflicts for this specific time
                  const testStartTime = new Date(selectedDate);
                  testStartTime.setHours(hour, minute, 0, 0);
                  const testEndTime = new Date(testStartTime);
                  testEndTime.setMinutes(testEndTime.getMinutes() + serviceDuration);
                  
                  const hasConflict = checkRecurringConflicts(
                    recurringAppointments,
                    exceptions.map(ex => ({
                      ...ex,
                      action_type: ex.action_type as 'cancelled' | 'rescheduled'
                    })),
                    testStartTime,
                    testEndTime,
                    excludeAppointmentId
                  );
                  
                  if (hasConflict) {
                    isAvailable = false;
                    conflictReason = 'Conflicto con serie recurrente';
                  }
                }
                
                slots.push({
                  time: timeKey,
                  isAvailable,
                  available: isAvailable,
                  conflictReason
                });
              }
            }
          }
        });
      }

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

  return {
    availableTimeSlots,
    isLoading,
    isRefreshing,
    lastUpdated,
    refreshAvailability
  };
};