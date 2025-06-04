
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks } from 'date-fns';
import { useRecurringInstances, useGenerateRecurringInstances } from './useRecurringInstances';

interface UseCalendarAppointmentsWithRecurringProps {
  selectedDate: Date;
  providerId?: string;
}

export const useCalendarAppointmentsWithRecurring = ({ 
  selectedDate, 
  providerId 
}: UseCalendarAppointmentsWithRecurringProps) => {
  const startDate = new Date(selectedDate);
  startDate.setDate(1); // Inicio del mes
  
  const endDate = addWeeks(selectedDate, 16); // Próximas 16 semanas

  const { generateInstances } = useGenerateRecurringInstances();

  // Obtener citas regulares
  const { data: regularAppointments = [], isLoading: loadingRegular } = useQuery({
    queryKey: ['calendar-appointments', format(selectedDate, 'yyyy-MM-dd'), providerId],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('*')
        .gte('start_time', format(startDate, 'yyyy-MM-dd'))
        .lte('start_time', format(endDate, 'yyyy-MM-dd'));

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching regular appointments:', error);
        throw error;
      }

      return data || [];
    }
  });

  // Obtener instancias recurrentes
  const { data: recurringInstances = [], isLoading: loadingRecurring } = useRecurringInstances({
    providerId,
    startDate,
    endDate
  });

  // Generar instancias faltantes si es necesario
  const { data: allRules = [] } = useQuery({
    queryKey: ['all-recurring-rules', providerId],
    queryFn: async () => {
      let query = supabase
        .from('recurring_rules')
        .select('*')
        .eq('is_active', true);

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recurring rules:', error);
        return [];
      }

      return data || [];
    }
  });

  // Generar instancias faltantes automáticamente
  useQuery({
    queryKey: ['generate-missing-instances', format(selectedDate, 'yyyy-MM-dd'), providerId],
    queryFn: async () => {
      const promises = allRules.map(rule => 
        generateInstances(rule.id, startDate, endDate).catch(error => {
          console.warn(`Could not generate instances for rule ${rule.id}:`, error);
          return 0;
        })
      );

      const results = await Promise.all(promises);
      console.log('Generated instances for missing rules:', results);
      return results;
    },
    enabled: allRules.length > 0
  });

  // Combinar citas regulares y recurrentes
  const combinedAppointments = [
    ...regularAppointments,
    ...recurringInstances.map(instance => ({
      id: instance.id,
      provider_id: instance.recurring_rules.provider_id,
      client_id: instance.recurring_rules.client_id,
      listing_id: instance.recurring_rules.listing_id,
      start_time: instance.start_time,
      end_time: instance.end_time,
      status: instance.status,
      notes: instance.notes || instance.recurring_rules.notes,
      apartment: instance.recurring_rules.apartment,
      client_address: instance.recurring_rules.client_address,
      client_phone: instance.recurring_rules.client_phone,
      client_email: instance.recurring_rules.client_email,
      client_name: instance.recurring_rules.client_name,
      recurring_rule_id: instance.recurring_rule_id,
      is_recurring_instance: true,
      recurrence: instance.recurring_rules.recurrence_type,
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
      recurrence_group_id: null
    }))
  ];

  return {
    data: combinedAppointments,
    isLoading: loadingRegular || loadingRecurring,
    regularAppointments,
    recurringInstances
  };
};
