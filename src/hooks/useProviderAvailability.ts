
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, addDays, isSameDay } from 'date-fns';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface UseProviderAvailabilityProps {
  providerId: string;
  selectedDate: Date;
  serviceDuration: number;
  recurrence?: string;
}

export const useProviderAvailability = ({
  providerId,
  selectedDate,
  serviceDuration,
  recurrence = 'once'
}: UseProviderAvailabilityProps) => {
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!providerId || !selectedDate) return;

      setIsLoading(true);
      
      try {
        console.log(`Checking availability for provider ${providerId} on ${format(selectedDate, 'yyyy-MM-dd')}`);
        
        // Generar slots de tiempo de 7 AM a 7 PM cada 30 minutos
        const timeSlots: TimeSlot[] = [];
        for (let hour = 7; hour < 19; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            timeSlots.push({
              time: timeString,
              available: true
            });
          }
        }

        // Obtener todas las citas del proveedor
        const { data: allAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('start_time, end_time, status, recurrence, is_recurring_instance')
          .eq('provider_id', providerId)
          .in('status', ['pending', 'confirmed', 'completed']);

        if (appointmentsError) {
          console.error('Error fetching appointments:', appointmentsError);
        }

        // Obtener slots bloqueados
        const dayOfWeek = selectedDate.getDay();
        const { data: blockedSlots, error: blockedError } = await supabase
          .from('blocked_time_slots')
          .select('start_hour, end_hour, day')
          .eq('provider_id', providerId)
          .or(`day.eq.${dayOfWeek},day.eq.-1`);

        if (blockedError) {
          console.error('Error fetching blocked slots:', blockedError);
        }

        // Procesar conflictos de citas
        const conflicts: any[] = [];
        
        if (allAppointments) {
          allAppointments.forEach(appointment => {
            const appointmentStart = new Date(appointment.start_time);
            const appointmentEnd = new Date(appointment.end_time);
            
            // Si es una cita regular en la fecha seleccionada
            if (!appointment.recurrence || appointment.recurrence === 'none') {
              if (isSameDay(appointmentStart, selectedDate)) {
                conflicts.push({
                  start_time: appointment.start_time,
                  end_time: appointment.end_time
                });
              }
            } 
            // Si es una cita recurrente, verificar si aplica para la fecha seleccionada
            else if (appointment.recurrence && appointment.recurrence !== 'none' && appointment.is_recurring_instance) {
              const dayOfWeekMatch = appointmentStart.getDay() === selectedDate.getDay();
              
              if (dayOfWeekMatch) {
                let shouldBlock = false;
                
                switch (appointment.recurrence) {
                  case 'weekly':
                    shouldBlock = true; // Cada semana en el mismo día
                    break;
                  case 'biweekly':
                    // Verificar si es una semana par/impar según la fecha original
                    const weeksDiff = Math.floor((selectedDate.getTime() - appointmentStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
                    shouldBlock = weeksDiff >= 0 && weeksDiff % 2 === 0;
                    break;
                  case 'monthly':
                    // Mismo día del mes
                    shouldBlock = appointmentStart.getDate() === selectedDate.getDate();
                    break;
                }
                
                if (shouldBlock) {
                  // Crear el horario para la fecha seleccionada
                  const selectedDateTime = new Date(selectedDate);
                  selectedDateTime.setHours(appointmentStart.getHours(), appointmentStart.getMinutes(), 0, 0);
                  
                  const selectedEndTime = new Date(selectedDateTime);
                  selectedEndTime.setTime(selectedEndTime.getTime() + (appointmentEnd.getTime() - appointmentStart.getTime()));
                  
                  conflicts.push({
                    start_time: selectedDateTime.toISOString(),
                    end_time: selectedEndTime.toISOString()
                  });
                }
              }
            }
          });
        }

        // Agregar slots bloqueados manualmente
        if (blockedSlots) {
          blockedSlots.forEach(blocked => {
            const startTime = new Date(selectedDate);
            startTime.setHours(blocked.start_hour, 0, 0, 0);
            
            const endTime = new Date(selectedDate);
            endTime.setHours(blocked.end_hour, 0, 0, 0);
            
            conflicts.push({
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString()
            });
          });
        }

        // Si se está creando una cita recurrente, verificar conflictos futuros
        if (recurrence !== 'once') {
          const futureDates = [];
          let checkDate = new Date(selectedDate);
          
          // Verificar las próximas 8 ocurrencias
          for (let i = 0; i < 8; i++) {
            if (recurrence === 'weekly') {
              checkDate = addWeeks(checkDate, 1);
            } else if (recurrence === 'biweekly') {
              checkDate = addWeeks(checkDate, 2);
            } else if (recurrence === 'monthly') {
              checkDate = addDays(checkDate, 30);
            }
            futureDates.push(new Date(checkDate));
          }

          // Verificar conflictos en fechas futuras
          for (const futureDate of futureDates) {
            if (allAppointments) {
              allAppointments.forEach(appointment => {
                const appointmentStart = new Date(appointment.start_time);
                
                if (isSameDay(appointmentStart, futureDate)) {
                  conflicts.push({
                    start_time: appointment.start_time,
                    end_time: appointment.end_time
                  });
                }
              });
            }
          }
        }

        console.log(`Found ${conflicts.length} conflicts for ${format(selectedDate, 'yyyy-MM-dd')}`);

        // Filtrar slots disponibles
        const availableSlots = timeSlots.filter(slot => {
          const [slotHour, slotMinute] = slot.time.split(':').map(Number);
          const slotStart = new Date(selectedDate);
          slotStart.setHours(slotHour, slotMinute, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

          // Verificar conflictos
          const hasConflict = conflicts.some(conflict => {
            const conflictStart = new Date(conflict.start_time);
            const conflictEnd = new Date(conflict.end_time);
            
            return (slotStart < conflictEnd && slotEnd > conflictStart);
          });

          return !hasConflict;
        });

        setAvailableTimeSlots(availableSlots);
        console.log(`Generated ${availableSlots.length} available slots out of ${timeSlots.length} total slots`);
        
      } catch (error) {
        console.error('Error checking availability:', error);
        setAvailableTimeSlots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [providerId, selectedDate, serviceDuration, recurrence]);

  return {
    availableTimeSlots,
    isLoading
  };
};
