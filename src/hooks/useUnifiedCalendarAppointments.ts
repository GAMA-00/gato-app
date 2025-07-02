import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addWeeks, startOfDay, endOfDay } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';
import { generateRecurringInstances } from './useRecurringInstances';

interface UseUnifiedCalendarAppointmentsProps {
  selectedDate: Date;
  providerId?: string;
}

export const useUnifiedCalendarAppointments = ({ 
  selectedDate, 
  providerId 
}: UseUnifiedCalendarAppointmentsProps) => {
  // Extender rango a 8 semanas para mejor cobertura
  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(addWeeks(selectedDate, 8));

  console.log('=== UNIFIED CALENDAR APPOINTMENTS START ===');
  console.log(`Provider ID: ${providerId}`);
  console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

  return useQuery({
    queryKey: ['unified-calendar-appointments', format(selectedDate, 'yyyy-MM-dd'), providerId],
    queryFn: async () => {
      console.log('=== FETCHING UNIFIED CALENDAR DATA ===');
      
      if (!providerId) {
        console.log('No provider ID provided');
        return [];
      }

      // 1. Obtener todas las citas regulares (no recurring instances)
      const { data: regularAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          listings(
            title,
            duration
          )
        `)
        .eq('provider_id', providerId)
        .not('status', 'in', '(cancelled,rejected,completed)')
        .order('start_time', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      console.log(`Fetched ${regularAppointments?.length || 0} regular appointments`);

      // 2. Obtener reglas recurrentes activas
      const { data: recurringRules, error: rulesError } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (rulesError) {
        console.error('Error fetching recurring rules:', rulesError);
        throw rulesError;
      }

      console.log(`Fetched ${recurringRules?.length || 0} recurring rules`);

      // 3. Generar instancias recurrentes usando la función
      const recurringInstances = generateRecurringInstances(
        recurringRules || [],
        startDate,
        endDate,
        regularAppointments || []
      );

      console.log(`Generated ${recurringInstances.length} recurring instances`);

      // 4. Combinar y filtrar por rango de fechas
      const allAppointments = [
        ...(regularAppointments || []).map(appointment => ({
          ...appointment,
          is_recurring_instance: appointment.is_recurring_instance || false,
          client_name: appointment.client_name || 'Cliente',
          service_title: appointment.listings?.title || 'Servicio',
          complete_location: buildAppointmentLocation({
            appointment,
            clientData: null
          })
        })),
        ...recurringInstances
      ];

      // 5. Filtrar por rango de fechas y remover duplicados
      const filteredAppointments = allAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.start_time);
        return appointmentDate >= startDate && appointmentDate <= endDate;
      });

      // 6. Remover duplicados por fecha/hora exacta
      const uniqueAppointments = filteredAppointments.reduce((acc, appointment) => {
        const key = `${appointment.provider_id}-${appointment.start_time}-${appointment.end_time}`;
        
        if (!acc.has(key)) {
          acc.set(key, appointment);
        } else {
          // Preferir citas regulares sobre instancias generadas
          const existing = acc.get(key);
          if (!existing.is_recurring_instance && appointment.is_recurring_instance) {
            // Mantener la cita regular
            console.log(`Skipping duplicate recurring instance for ${appointment.start_time}`);
          } else if (existing.is_recurring_instance && !appointment.is_recurring_instance) {
            // Reemplazar con cita regular
            acc.set(key, appointment);
            console.log(`Replacing recurring instance with regular appointment for ${appointment.start_time}`);
          }
        }
        
        return acc;
      }, new Map());

      const finalAppointments = Array.from(uniqueAppointments.values());

      console.log('=== UNIFIED CALENDAR RESULT ===');
      console.log(`Regular appointments: ${regularAppointments?.length || 0}`);
      console.log(`Recurring instances: ${recurringInstances.length}`);
      console.log(`Combined total: ${allAppointments.length}`);
      console.log(`After filtering and deduplication: ${finalAppointments.length}`);
      console.log('===============================');

      return finalAppointments;
    },
    staleTime: 60000,
    refetchInterval: false,
    enabled: !!providerId
  });
};