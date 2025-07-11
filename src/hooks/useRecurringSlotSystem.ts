import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, addWeeks } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';
import { 
  getAllRecurringInstances, 
  type RecurringAppointment, 
  type RecurringException,
  type CalculatedRecurringInstance 
} from '@/utils/simplifiedRecurrenceUtils';

interface UseRecurringSlotSystemProps {
  selectedDate: Date;
  providerId?: string;
  clientId?: string;
}

interface RecurringSlotAppointment {
  id: string;
  provider_id: string;
  client_id: string;
  listing_id: string;
  start_time: string;
  end_time: string;
  status: string;
  recurrence: string;
  client_name: string;
  service_title: string;
  notes: string | null;
  is_recurring_instance: boolean;
  recurring_rule_id?: string;
  complete_location: string;
  external_booking: boolean;
  recurring_blocked?: boolean;
}

export const useRecurringSlotSystem = ({ 
  selectedDate, 
  providerId,
  clientId 
}: UseRecurringSlotSystemProps) => {
  // Extended range: 1 month back, 12 months ahead to show the full year of recurring appointments
  const startDate = startOfDay(addWeeks(selectedDate, -4));
  const endDate = endOfDay(addWeeks(selectedDate, 52));

  return useQuery({
    queryKey: ['recurring-slot-system', format(selectedDate, 'yyyy-MM-dd'), providerId, clientId],
    queryFn: async () => {
      const appointments: RecurringSlotAppointment[] = [];

      // 1. Get regular appointments (including recurring ones)
      if (providerId) {
        const { data: regularAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            listings(title, duration)
          `)
          .eq('provider_id', providerId)
          .in('status', ['pending', 'confirmed', 'completed', 'scheduled'])
          .gte('start_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString())
          .order('start_time', { ascending: true });

        if (appointmentsError) {
          console.error('❌ Error fetching appointments:', appointmentsError);
          throw appointmentsError;
        }

        // Process regular appointments
        (regularAppointments || []).forEach(appointment => {
          appointments.push({
            ...appointment,
            is_recurring_instance: appointment.is_recurring_instance || false,
            client_name: appointment.client_name || 'Cliente',
            service_title: appointment.listings?.title || 'Servicio',
            complete_location: buildAppointmentLocation({
              appointment,
              clientData: null
            }),
            recurrence: appointment.recurrence || 'none',
            recurring_blocked: false
          });
        });
      }

      // 2. Get recurring appointments (those with recurrence != 'none')
      let recurringQuery = supabase
        .from('appointments')
        .select(`
          *,
          listings(title, duration)
        `)
        .neq('recurrence', 'none')
        .not('recurrence', 'is', null)
        .in('status', ['confirmed', 'pending'])
        .order('created_at', { ascending: true });

      if (providerId) {
        recurringQuery = recurringQuery.eq('provider_id', providerId);
      }
      if (clientId) {
        recurringQuery = recurringQuery.eq('client_id', clientId);
      }

      const { data: recurringAppointments, error: recurringError } = await recurringQuery;

      if (recurringError) {
        console.error('❌ Error fetching recurring appointments:', recurringError);
        throw recurringError;
      }

      // 3. Get recurring exceptions
      const appointmentIds = (recurringAppointments || []).map(app => app.id);
      let exceptions: RecurringException[] = [];

      if (appointmentIds.length > 0) {
        const { data: exceptionsData, error: exceptionsError } = await supabase
          .from('recurring_exceptions')
          .select('*')
          .in('appointment_id', appointmentIds)
          .gte('exception_date', format(startDate, 'yyyy-MM-dd'))
          .lte('exception_date', format(endDate, 'yyyy-MM-dd'));

        if (exceptionsError) {
          console.error('❌ Error fetching recurring exceptions:', exceptionsError);
          throw exceptionsError;
        }

        exceptions = (exceptionsData || []) as RecurringException[];
      }

      // 4. Calculate recurring instances
      if (recurringAppointments && recurringAppointments.length > 0) {
        const recurringInstances = getAllRecurringInstances(
          recurringAppointments as RecurringAppointment[],
          exceptions,
          startDate,
          endDate,
          providerId
        );

        // Convert to RecurringSlotAppointment format
        recurringInstances.forEach(instance => {
          // Skip cancelled instances
          if (instance.status === 'cancelled') {
            return;
          }

          const originalAppointment = instance.original_appointment;
          const displayStart = instance.status === 'rescheduled' && instance.new_start_time 
            ? instance.new_start_time 
            : instance.start_time;
          const displayEnd = instance.status === 'rescheduled' && instance.new_end_time 
            ? instance.new_end_time 
            : instance.end_time;

          appointments.push({
            id: `recurring-${originalAppointment.id}-${format(instance.date, 'yyyy-MM-dd')}`,
            provider_id: originalAppointment.provider_id,
            client_id: originalAppointment.client_id,
            listing_id: originalAppointment.listing_id,
            start_time: displayStart.toISOString(),
            end_time: displayEnd.toISOString(),
            status: instance.status === 'rescheduled' ? 'confirmed' : 'confirmed',
            recurrence: originalAppointment.recurrence,
            client_name: originalAppointment.client_name || 'Cliente',
            service_title: 'Servicio Recurrente', // We'll need to get this from listings
            notes: instance.exception?.notes || originalAppointment.notes,
            is_recurring_instance: true,
            recurring_rule_id: originalAppointment.id,
            complete_location: buildAppointmentLocation({
              appointment: originalAppointment,
              clientData: null
            }),
            external_booking: false,
            recurring_blocked: false
          });
        });
      }

      // 5. Remove duplicates, prioritizing regular appointments over recurring instances
      const uniqueAppointments = appointments.reduce((acc, appointment) => {
        const key = `${appointment.provider_id}-${appointment.start_time}-${appointment.end_time}`;
        
        if (!acc.has(key)) {
          acc.set(key, appointment);
        } else {
          const existing = acc.get(key);
          
          // Priority: regular appointment > recurring instance
          if (existing.is_recurring_instance && !appointment.is_recurring_instance) {
            acc.set(key, appointment);
            console.log(`🔄 Replaced recurring instance with regular appointment for ${appointment.start_time}`);
          }
        }
        
        return acc;
      }, new Map());

      const finalAppointments = Array.from(uniqueAppointments.values());

      console.log(`📅 Loaded ${finalAppointments.length} appointments (${appointments.length - finalAppointments.length} duplicates removed)`);
      
      return finalAppointments;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: false,
    enabled: !!(providerId || clientId),
    refetchOnWindowFocus: true
  });
};

// Hook for getting the next client appointment
export const useNextClientAppointment = (clientId?: string) => {
  return useQuery({
    queryKey: ['next-client-appointment', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const now = new Date();
      const futureDate = addWeeks(now, 4);

      // Get regular appointments
      const { data: regularAppointment } = await supabase
        .from('appointments')
        .select(`
          *,
          listings(title, duration)
        `)
        .eq('client_id', clientId)
        .in('status', ['pending', 'confirmed', 'scheduled'])
        .gte('start_time', now.toISOString())
        .order('start_time', { ascending: true })
        .limit(1);

      // Get recurring appointments
      const { data: recurringAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          listings(title, duration)
        `)
        .eq('client_id', clientId)
        .neq('recurrence', 'none')
        .not('recurrence', 'is', null)
        .in('status', ['confirmed', 'pending']);

      // Get exceptions
      const appointmentIds = (recurringAppointments || []).map(app => app.id);
      let exceptions: RecurringException[] = [];

      if (appointmentIds.length > 0) {
        const { data: exceptionsData } = await supabase
          .from('recurring_exceptions')
          .select('*')
          .in('appointment_id', appointmentIds)
          .gte('exception_date', format(now, 'yyyy-MM-dd'));

        exceptions = (exceptionsData || []) as RecurringException[];
      }

      // Calculate next recurring instance
      let nextRecurringInstance = null;
      if (recurringAppointments && recurringAppointments.length > 0) {
        const recurringInstances = getAllRecurringInstances(
          recurringAppointments as RecurringAppointment[],
          exceptions,
          now,
          futureDate
        );

        const nextInstance = recurringInstances
          .filter(instance => instance.status !== 'cancelled')
          .sort((a, b) => {
            const timeA = a.status === 'rescheduled' && a.new_start_time 
              ? a.new_start_time.getTime() 
              : a.start_time.getTime();
            const timeB = b.status === 'rescheduled' && b.new_start_time 
              ? b.new_start_time.getTime() 
              : b.start_time.getTime();
            return timeA - timeB;
          })[0];

        if (nextInstance) {
          const displayStart = nextInstance.status === 'rescheduled' && nextInstance.new_start_time 
            ? nextInstance.new_start_time 
            : nextInstance.start_time;
          const displayEnd = nextInstance.status === 'rescheduled' && nextInstance.new_end_time 
            ? nextInstance.new_end_time 
            : nextInstance.end_time;

          nextRecurringInstance = {
            id: `recurring-${nextInstance.appointment_id}-${format(nextInstance.date, 'yyyy-MM-dd')}`,
            provider_id: nextInstance.original_appointment.provider_id,
            client_id: nextInstance.original_appointment.client_id,
            listing_id: nextInstance.original_appointment.listing_id,
            start_time: displayStart.toISOString(),
            end_time: displayEnd.toISOString(),
            status: 'confirmed',
            recurrence: nextInstance.original_appointment.recurrence,
            service_title: 'Servicio Recurrente',
            is_recurring_blocked: true
          };
        }
      }

      // Determine which is closer
      if (regularAppointment?.[0] && nextRecurringInstance) {
        const regularTime = new Date(regularAppointment[0].start_time).getTime();
        const recurringTime = new Date(nextRecurringInstance.start_time).getTime();
        
        return regularTime <= recurringTime ? {
          ...regularAppointment[0],
          service_title: regularAppointment[0].listings?.title || 'Servicio',
          is_recurring_blocked: false
        } : nextRecurringInstance;
      }

      if (regularAppointment?.[0]) {
        return {
          ...regularAppointment[0],
          service_title: regularAppointment[0].listings?.title || 'Servicio',
          is_recurring_blocked: false
        };
      }

      return nextRecurringInstance;
    },
    staleTime: 30 * 1000,
    enabled: !!clientId
  });
};