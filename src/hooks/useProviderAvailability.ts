import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

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

      if (!providerAvailability || providerAvailability.length === 0) {
        console.log('No availability configured for this day');
        setAvailableTimeSlots([]);
        return;
      }

      // 2. Obtener slots disponibles del proveedor para esta fecha
      const { data: timeSlots, error: slotsError } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', providerId)
        .eq('slot_date', targetDate)
        .eq('is_available', true)
        .eq('is_reserved', false);

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

      // 4. Verificar conflictos con citas recurrentes si aplica
      let recurringConflicts: any[] = [];
      if (recurrence && recurrence !== 'none' && recurrence !== 'once') {
        const { data: recurringRules, error: recurringError } = await supabase
          .from('recurring_rules')
          .select('*')
          .eq('provider_id', providerId)
          .eq('is_active', true)
          .eq('recurrence_type', recurrence);

        if (recurringError) {
          console.error('Error checking recurring conflicts:', recurringError);
        } else if (recurringRules) {
          // Filtrar reglas que aplican para este día según el tipo de recurrencia
          recurringConflicts = recurringRules.filter(rule => {
            if (recurrence === 'weekly' || recurrence === 'biweekly') {
              return rule.day_of_week === dayOfWeek;
            } else if (recurrence === 'monthly') {
              return rule.day_of_month === selectedDate.getDate();
            }
            return false;
          });
        }
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

      // Marcar horarios bloqueados por conflictos recurrentes
      recurringConflicts.forEach(rule => {
        const startTime = rule.start_time;
        const endTime = rule.end_time;
        
        if (startTime && endTime) {
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);
          
          for (let hour = startHour; hour <= endHour; hour++) {
            const timeKey = `${hour.toString().padStart(2, '0')}:${hour === startHour ? startMinute.toString().padStart(2, '0') : '00'}`;
            if (hour === endHour && endMinute === 0) break;
            blockedTimes.add(timeKey);
          }
        }
      });

      // Generar slots basados en disponibilidad configurada o slots existentes
      if (timeSlots && timeSlots.length > 0) {
        // Usar slots específicos del proveedor
        timeSlots.forEach(slot => {
          const timeKey = slot.start_time;
          const isBlocked = blockedTimes.has(timeKey);
          
          slots.push({
            time: timeKey,
            isAvailable: !isBlocked,
            available: !isBlocked,
            conflictReason: isBlocked ? 'Horario ocupado' : undefined
          });
        });
      } else {
        // Generar slots basados en disponibilidad general
        providerAvailability.forEach(availability => {
          const startTime = availability.start_time;
          const endTime = availability.end_time;
          
          if (startTime && endTime) {
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            
            // Generar slots cada hora dentro del rango
            for (let hour = startHour; hour < endHour; hour++) {
              const timeKey = `${hour.toString().padStart(2, '0')}:00`;
              const isBlocked = blockedTimes.has(timeKey);
              
              slots.push({
                time: timeKey,
                isAvailable: !isBlocked,
                available: !isBlocked,
                conflictReason: isBlocked ? 'Horario ocupado' : undefined
              });
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

  return {
    availableTimeSlots,
    isLoading,
    isRefreshing,
    lastUpdated,
    refreshAvailability
  };
};