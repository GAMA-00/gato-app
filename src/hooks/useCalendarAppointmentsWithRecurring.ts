
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
  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(addWeeks(selectedDate, 12));

  // Obtener todas las citas de la base de datos
  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ['calendar-appointments', format(selectedDate, 'yyyy-MM-dd'), providerId],
    queryFn: async () => {
      console.log('=== FETCHING ALL APPOINTMENTS ===');
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          listings(
            title,
            duration
          )
        `)
        .in('status', ['pending', 'confirmed', 'completed']);

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} total appointments from database`);
      return data || [];
    },
    staleTime: 30000,
    refetchInterval: false
  });

  // Separar citas regulares (dentro del rango de fechas) y citas recurrentes base
  const regularAppointments = allAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.start_time);
    const isInRange = appointmentDate >= startDate && appointmentDate <= endDate;
    const isNotRecurring = !appointment.recurrence || appointment.recurrence === 'none';
    
    return isInRange && isNotRecurring;
  });

  // Obtener citas recurrentes base (is_recurring_instance = true y tienen recurrencia activa)
  const recurringBaseAppointments = allAppointments.filter(appointment => {
    return appointment.recurrence && 
           appointment.recurrence !== 'none' && 
           appointment.is_recurring_instance === true &&
           appointment.status !== 'cancelled';
  });

  console.log(`Regular appointments in range: ${regularAppointments.length}`);
  console.log(`Recurring base appointments: ${recurringBaseAppointments.length}`);

  // Expandir las citas recurrentes usando el hook especializado
  const recurringInstances = useRecurringAppointments({
    recurringAppointments: recurringBaseAppointments,
    startDate,
    endDate
  });

  console.log(`Generated recurring instances: ${recurringInstances.length}`);

  // Combinar TODAS las citas: regulares + instancias recurrentes
  const combinedAppointments = [
    // Citas regulares con información completa
    ...regularAppointments.map(appointment => ({
      ...appointment,
      is_recurring_instance: false,
      client_name: appointment.client_name || 'Cliente',
      service_title: appointment.listings?.title || 'Servicio'
    })),
    // Instancias recurrentes expandidas
    ...recurringInstances
  ];

  console.log('=== FINAL CALENDAR APPOINTMENTS ===');
  console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
  console.log(`Regular: ${regularAppointments.length}`);
  console.log(`Recurring Base: ${recurringBaseAppointments.length}`);
  console.log(`Recurring Instances: ${recurringInstances.length}`);
  console.log(`TOTAL COMBINED: ${combinedAppointments.length}`);
  
  // Mostrar algunos ejemplos para debug
  if (combinedAppointments.length > 0) {
    console.log('Sample combined appointments:', combinedAppointments.slice(0, 5).map(app => ({
      id: app.id,
      client_name: app.client_name,
      start_time: app.start_time,
      is_recurring: app.is_recurring_instance,
      recurrence: app.recurrence,
      status: app.status
    })));
  }
  
  console.log('=======================================');

  return {
    data: combinedAppointments,
    isLoading,
    regularAppointments,
    recurringInstances,
    conflicts: []
  };
};
