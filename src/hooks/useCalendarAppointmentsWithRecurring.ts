
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, startOfDay, endOfDay } from 'date-fns';
import { useRecurringInstances } from './useRecurringInstances';

interface UseCalendarAppointmentsWithRecurringProps {
  selectedDate: Date;
  providerId?: string;
}

export const useCalendarAppointmentsWithRecurring = ({ 
  selectedDate, 
  providerId 
}: UseCalendarAppointmentsWithRecurringProps) => {
  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(addWeeks(selectedDate, 12)); // Optimizado a 12 semanas

  // Obtener citas regulares
  const { data: regularAppointments = [], isLoading: loadingRegular } = useQuery({
    queryKey: ['calendar-appointments', format(selectedDate, 'yyyy-MM-dd'), providerId],
    queryFn: async () => {
      console.log('=== FETCHING REGULAR APPOINTMENTS ===');
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          listings(
            title,
            duration
          )
        `)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .in('status', ['pending', 'confirmed', 'completed']);

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching regular appointments:', error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} regular appointments`);
      return data || [];
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: false // No auto-refetch
  });

  // Obtener instancias recurrentes de forma optimizada
  const { data: recurringInstances = [], isLoading: loadingRecurring } = useRecurringInstances({
    providerId,
    startDate,
    endDate
  });

  // Combinar citas regulares y recurrentes
  const combinedAppointments = [
    // Citas regulares
    ...regularAppointments.map(appointment => ({
      ...appointment,
      is_recurring_instance: false,
      client_name: appointment.client_name || 'Cliente',
      client_phone: appointment.client_phone || '',
      client_email: appointment.client_email || '',
      service_title: ((appointment.listings as any)?.title) || 'Servicio'
    })),
    // Instancias recurrentes
    ...recurringInstances.map(instance => {
      const recurringRule = (instance.recurring_rules as any);
      const listings = recurringRule?.listings;
      
      if (!recurringRule) {
        console.warn('Recurring instance without rule:', instance.id);
        return null;
      }
      
      return {
        id: instance.id,
        provider_id: recurringRule.provider_id,
        client_id: recurringRule.client_id,
        listing_id: recurringRule.listing_id,
        start_time: instance.start_time,
        end_time: instance.end_time,
        status: instance.status || 'confirmed',
        notes: instance.notes || recurringRule.notes,
        apartment: recurringRule.apartment,
        client_address: recurringRule.client_address,
        client_phone: recurringRule.client_phone,
        client_email: recurringRule.client_email,
        client_name: recurringRule.client_name || 'Cliente Recurrente',
        recurring_rule_id: instance.recurring_rule_id,
        is_recurring_instance: true,
        recurrence: recurringRule.recurrence_type,
        service_title: listings?.title || 'Servicio Recurrente',
        // Campos adicionales para compatibilidad
        provider_name: null,
        admin_notes: null,
        cancellation_time: null,
        refund_percentage: null,
        last_modified_by: null,
        last_modified_at: null,
        created_at: instance.created_at,
        external_booking: false,
        residencia_id: null,
        recurrence_group_id: null,
        listings: {
          title: listings?.title || 'Servicio Recurrente',
          duration: listings?.duration || 60
        }
      };
    }).filter(Boolean)
  ];

  // Debug simplificado
  console.log('=== CALENDAR APPOINTMENTS DEBUG ===');
  console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
  console.log(`Regular: ${regularAppointments.length}, Recurring: ${recurringInstances.length}, Combined: ${combinedAppointments.length}`);
  console.log('=======================================');

  return {
    data: combinedAppointments,
    isLoading: loadingRegular || loadingRecurring,
    regularAppointments,
    recurringInstances,
    conflicts: []
  };
};
