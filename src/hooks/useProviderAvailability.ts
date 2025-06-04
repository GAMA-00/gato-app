
import { useMemo } from 'react';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { format, isSameDay, addMinutes, parseISO, addWeeks, addMonths, isSameWeekDay, getDay } from 'date-fns';

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

interface UseProviderAvailabilityProps {
  providerId: string;
  selectedDate: Date;
  serviceDuration: number; // in minutes
  recurrence?: string; // 'once', 'weekly', 'biweekly', 'monthly'
}

export const useProviderAvailability = ({
  providerId,
  selectedDate,
  serviceDuration,
  recurrence = 'once'
}: UseProviderAvailabilityProps) => {
  const { blockedSlots } = useBlockedTimeSlots();
  const { data: appointments = [] } = useCalendarAppointments(selectedDate);

  const availableTimeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const dayOfWeek = selectedDate.getDay();
    
    // Generate future dates to check based on recurrence
    const datesToCheck = [selectedDate];
    if (recurrence !== 'once') {
      const numberOfInstances = 8; // Check availability for 8 instances
      for (let i = 1; i < numberOfInstances; i++) {
        let futureDate = new Date(selectedDate);
        
        switch (recurrence) {
          case 'weekly':
            futureDate = addWeeks(selectedDate, i);
            break;
          case 'biweekly':
            futureDate = addWeeks(selectedDate, i * 2);
            break;
          case 'monthly':
            futureDate = addMonths(selectedDate, i);
            break;
          default:
            break;
        }
        
        datesToCheck.push(futureDate);
      }
    }
    
    // Generate time slots from 6 AM to 8 PM (every 30 minutes)
    for (let hour = 6; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        let available = true;
        let reason = '';

        // Check availability for all dates in the recurrence pattern
        for (const dateToCheck of datesToCheck) {
          const slotStart = new Date(dateToCheck);
          slotStart.setHours(hour, minute, 0, 0);
          const slotEnd = addMinutes(slotStart, serviceDuration);
          
          // Skip if slot would end after 8 PM
          if (slotEnd.getHours() > 20) {
            available = false;
            reason = 'Horario fuera del rango de trabajo';
            break;
          }

          // Check if slot conflicts with blocked time slots
          const conflictingBlockedSlot = blockedSlots.find(blockedSlot => {
            // Check if this blocked slot applies to the current day
            const appliesToDay = blockedSlot.day === dateToCheck.getDay() || blockedSlot.day === -1; // -1 means all days
            
            if (!appliesToDay) return false;
            
            // Convert blocked slot hours to actual times for comparison
            const blockStart = new Date(dateToCheck);
            blockStart.setHours(blockedSlot.startHour, 0, 0, 0);
            const blockEnd = new Date(dateToCheck);
            blockEnd.setHours(blockedSlot.endHour, 0, 0, 0);
            
            // Check if the service slot overlaps with the blocked time
            return (slotStart < blockEnd && slotEnd > blockStart);
          });

          if (conflictingBlockedSlot) {
            available = false;
            reason = 'Horario bloqueado por el proveedor';
            break;
          }

          // Check if slot conflicts with existing appointments
          const conflictingAppointment = appointments.find(appointment => {
            if (appointment.provider_id !== providerId) return false;
            if (appointment.status === 'cancelled' || appointment.status === 'rejected') return false;
            
            const appointmentDate = new Date(appointment.start_time);
            if (!isSameDay(appointmentDate, dateToCheck)) return false;
            
            const appointmentStart = new Date(appointment.start_time);
            const appointmentEnd = new Date(appointment.end_time);
            
            // Check if the service slot overlaps with the appointment
            return (slotStart < appointmentEnd && slotEnd > appointmentStart);
          });

          if (conflictingAppointment) {
            available = false;
            reason = recurrence === 'once' ? 'Horario ocupado' : `Horario ocupado en ${recurrence === 'weekly' ? 'alguna semana' : recurrence === 'biweekly' ? 'alguna quincena' : 'algún mes'}`;
            break;
          }
        }

        slots.push({
          time: timeString,
          available,
          reason
        });
      }
    }

    return slots;
  }, [blockedSlots, appointments, selectedDate, serviceDuration, providerId, recurrence]);

  return {
    availableTimeSlots,
    isLoading: false
  };
};
