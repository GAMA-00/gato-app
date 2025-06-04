
import { useMemo } from 'react';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { format, isSameDay, addMinutes, addWeeks, addMonths, getDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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

const useRecurringRules = (providerId: string) => {
  return useQuery({
    queryKey: ['recurring-rules', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching recurring rules:', error);
        return [];
      }

      return data || [];
    }
  });
};

export const useProviderAvailability = ({
  providerId,
  selectedDate,
  serviceDuration,
  recurrence = 'once'
}: UseProviderAvailabilityProps) => {
  const { blockedSlots } = useBlockedTimeSlots();
  const { data: appointments = [] } = useCalendarAppointments(selectedDate);
  const { data: recurringRules = [] } = useRecurringRules(providerId);

  const availableTimeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    
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

          // Check if slot conflicts with recurring rules
          const conflictingRecurringRule = recurringRules.find(rule => {
            const ruleDayOfWeek = rule.day_of_week;
            const ruleDayOfMonth = rule.day_of_month;
            const ruleStartTime = rule.start_time;
            const ruleEndTime = rule.end_time;
            
            // Convert times for comparison
            const slotTimeStr = format(slotStart, 'HH:mm:ss');
            const slotEndTimeStr = format(slotEnd, 'HH:mm:ss');
            
            // Check if this recurring rule applies to the current date
            let appliesToDate = false;
            
            if (rule.recurrence_type === 'weekly') {
              appliesToDate = getDay(dateToCheck) === ruleDayOfWeek;
            } else if (rule.recurrence_type === 'biweekly') {
              const daysSinceStart = Math.floor((dateToCheck.getTime() - new Date(rule.start_date).getTime()) / (1000 * 60 * 60 * 24));
              appliesToDate = getDay(dateToCheck) === ruleDayOfWeek && daysSinceStart % 14 === 0;
            } else if (rule.recurrence_type === 'monthly') {
              appliesToDate = dateToCheck.getDate() === ruleDayOfMonth;
            }
            
            if (!appliesToDate) return false;
            
            // Check time overlap
            return ruleStartTime < slotEndTimeStr && ruleEndTime > slotTimeStr;
          });

          if (conflictingRecurringRule) {
            available = false;
            reason = recurrence === 'once' ? 'Horario reservado recurrentemente' : `Conflicto con reserva recurrente en ${recurrence === 'weekly' ? 'alguna semana' : recurrence === 'biweekly' ? 'alguna quincena' : 'algún mes'}`;
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
  }, [blockedSlots, appointments, selectedDate, serviceDuration, providerId, recurrence, recurringRules]);

  return {
    availableTimeSlots,
    isLoading: false
  };
};
