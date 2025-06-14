
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, startOfDay, endOfDay } from 'date-fns';
import { useRecurringAppointments } from './useRecurringAppointments';

interface UseCalendarAppointmentsWithRecurringProps {
  selectedDate: Date;
  providerId?: string;
}

export const useCalendarAppointmentsWithRecurring = ({ 
  selectedDate, 
  providerId 
}: UseCalendarAppointmentsWithRecurringProps) => {
  // Reducir el rango a solo 4 semanas para optimizar
  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(addWeeks(selectedDate, 4));

  console.log('=== CALENDAR APPOINTMENTS HOOK START ===');
  console.log(`Provider ID: ${providerId}`);
  console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

  // Obtener TODAS las citas del proveedor - query simplificada
  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ['calendar-appointments-simple', format(selectedDate, 'yyyy-MM-dd'), providerId],
    queryFn: async () => {
      console.log('=== FETCHING ALL APPOINTMENTS - SIMPLIFIED ===');
      
      if (!providerId) {
        console.log('No provider ID provided');
        return [];
      }

      // Query super simple - solo obtener citas del proveedor
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          listings(
            title,
            duration
          )
        `)
        .eq('provider_id', providerId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      console.log(`Raw appointments from DB: ${data?.length || 0}`);
      
      // Log detallado de las primeras 3 citas
      if (data && data.length > 0) {
        console.log('First 3 appointments from DB:', data.slice(0, 3).map(app => ({
          id: app.id,
          client_name: app.client_name,
          start_time: app.start_time,
          status: app.status,
          recurrence: app.recurrence,
          is_recurring_instance: app.is_recurring_instance
        })));
      }

      return data || [];
    },
    staleTime: 60000,
    refetchInterval: false
  });

  // Filtrar solo citas activas (no canceladas/rechazadas)
  const activeAppointments = allAppointments.filter(appointment => {
    const isActive = appointment.status !== 'cancelled' && appointment.status !== 'rejected';
    return isActive;
  });

  console.log(`Active appointments: ${activeAppointments.length} out of ${allAppointments.length}`);

  // Separar citas regulares y recurrentes de forma más simple
  const regularAppointments = activeAppointments.filter(appointment => {
    // Una cita regular es aquella que NO tiene recurrencia o recurrencia = 'none'
    const isRegular = !appointment.recurrence || appointment.recurrence === 'none' || appointment.recurrence === null;
    return isRegular;
  });

  const recurringBaseAppointments = activeAppointments.filter(appointment => {
    // Una cita recurrente es aquella que SÍ tiene recurrencia y no es 'none'
    const isRecurring = appointment.recurrence && 
                       appointment.recurrence !== 'none' && 
                       appointment.recurrence !== null;
    return isRecurring;
  });

  console.log(`Regular appointments: ${regularAppointments.length}`);
  console.log(`Recurring base appointments: ${recurringBaseAppointments.length}`);

  if (regularAppointments.length > 0) {
    console.log('Sample regular appointments:', regularAppointments.slice(0, 2).map(app => ({
      id: app.id,
      client_name: app.client_name,
      start_time: app.start_time,
      recurrence: app.recurrence
    })));
  }

  if (recurringBaseAppointments.length > 0) {
    console.log('Sample recurring appointments:', recurringBaseAppointments.slice(0, 2).map(app => ({
      id: app.id,
      client_name: app.client_name,
      start_time: app.start_time,
      recurrence: app.recurrence
    })));
  }

  // Expandir las citas recurrentes
  const recurringInstances = useRecurringAppointments({
    recurringAppointments: recurringBaseAppointments,
    startDate,
    endDate
  });

  console.log(`Generated recurring instances: ${recurringInstances.length}`);

  // Filtrar citas regulares que estén en el rango de fechas
  const regularInRange = regularAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.start_time);
    const isInRange = appointmentDate >= startDate && appointmentDate <= endDate;
    return isInRange;
  });

  console.log(`Regular appointments in range: ${regularInRange.length}`);

  // Combinar todas las citas
  const combinedAppointments = [
    ...regularInRange.map(appointment => ({
      ...appointment,
      is_recurring_instance: false,
      client_name: appointment.client_name || 'Cliente',
      service_title: appointment.listings?.title || 'Servicio'
    })),
    ...recurringInstances
  ];

  console.log('=== FINAL CALENDAR RESULT ===');
  console.log(`Regular in range: ${regularInRange.length}`);
  console.log(`Recurring instances: ${recurringInstances.length}`);
  console.log(`TOTAL COMBINED: ${combinedAppointments.length}`);
  console.log('===============================');

  return {
    data: combinedAppointments,
    isLoading,
    regularAppointments: regularInRange,
    recurringInstances,
    conflicts: []
  };
};
