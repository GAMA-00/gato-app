
import { useMemo } from 'react';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { format, isSameDay, addMinutes, parseISO } from 'date-fns';

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

interface UseProviderAvailabilityProps {
  providerId: string;
  selectedDate: Date;
  serviceDuration: number; // in minutes
}

export const useProviderAvailability = ({
  providerId,
  selectedDate,
  serviceDuration
}: UseProviderAvailabilityProps) => {
  const { blockedSlots } = useBlockedTimeSlots();
  const { data: appointments = [] } = useCalendarAppointments(selectedDate);

  const availableTimeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const dayOfWeek = selectedDate.getDay();
    
    // Generate time slots from 6 AM to 8 PM (every 30 minutes)
    for (let hour = 6; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotStart = new Date(selectedDate);
        slotStart.setHours(hour, minute, 0, 0);
        const slotEnd = addMinutes(slotStart, serviceDuration);
        
        let available = true;
        let reason = '';

        // Check if slot conflicts with blocked time slots
        const conflictingBlockedSlot = blockedSlots.find(blockedSlot => {
          // Check if this blocked slot applies to the current day
          const appliesToDay = blockedSlot.day === dayOfWeek || blockedSlot.day === -1; // -1 means all days
          
          if (!appliesToDay) return false;
          
          // Convert blocked slot hours to actual times for comparison
          const blockStart = new Date(selectedDate);
          blockStart.setHours(blockedSlot.startHour, 0, 0, 0);
          const blockEnd = new Date(selectedDate);
          blockEnd.setHours(blockedSlot.endHour, 0, 0, 0);
          
          // Check if the service slot overlaps with the blocked time
          return (slotStart < blockEnd && slotEnd > blockStart);
        });

        if (conflictingBlockedSlot) {
          available = false;
          reason = 'Horario bloqueado por el proveedor';
        }

        // Check if slot conflicts with existing appointments
        const conflictingAppointment = appointments.find(appointment => {
          if (appointment.provider_id !== providerId) return false;
          if (appointment.status === 'cancelled' || appointment.status === 'rejected') return false;
          
          const appointmentDate = new Date(appointment.start_time);
          if (!isSameDay(appointmentDate, selectedDate)) return false;
          
          const appointmentStart = new Date(appointment.start_time);
          const appointmentEnd = new Date(appointment.end_time);
          
          // Check if the service slot overlaps with the appointment
          return (slotStart < appointmentEnd && slotEnd > appointmentStart);
        });

        if (conflictingAppointment && available) {
          available = false;
          reason = 'Horario ocupado';
        }

        // Only add slots that have enough time before the end of the day
        if (slotEnd.getHours() <= 20) {
          slots.push({
            time: timeString,
            available,
            reason
          });
        }
      }
    }

    return slots;
  }, [blockedSlots, appointments, selectedDate, serviceDuration, providerId]);

  return {
    availableTimeSlots,
    isLoading: false // You can add loading states from the hooks if needed
  };
};
