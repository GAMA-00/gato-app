import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addWeeks, startOfDay, endOfDay } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';
import { generateRecurringInstances } from '@/utils/recurringInstanceGenerator';
import { useProviderRecurringRules } from './useProviderRecurringRules';

interface UseUnifiedCalendarAppointmentsProps {
  selectedDate: Date;
  providerId?: string;
}

export const useUnifiedCalendarAppointments = ({ 
  selectedDate, 
  providerId 
}: UseUnifiedCalendarAppointmentsProps) => {
  // Ampliar significativamente el rango: 12 semanas atrás, 16 semanas adelante
  const startDate = startOfDay(addWeeks(selectedDate, -12));
  const endDate = endOfDay(addWeeks(selectedDate, 16));

  console.log('=== UNIFIED CALENDAR APPOINTMENTS START ===');
  console.log(`Provider ID: ${providerId}`);
  console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

  // Obtener reglas recurrentes del proveedor
  const { data: recurringRules = [], isLoading: rulesLoading } = useProviderRecurringRules(providerId);

  const queryResult = useQuery({
    queryKey: ['unified-calendar-appointments', format(selectedDate, 'yyyy-MM-dd'), providerId, recurringRules.length],
    queryFn: async () => {
      console.log('=== FETCHING UNIFIED CALENDAR DATA ===');
      
      if (!providerId) {
        console.log('No provider ID provided');
        return [];
      }

      // 1. Obtener todas las citas relevantes (incluye scheduled para recurrentes)
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
        .in('status', ['pending', 'confirmed', 'completed', 'scheduled'])
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      console.log(`Fetched ${regularAppointments?.length || 0} regular appointments`);

      // 2. Generar instancias recurrentes usando las reglas
      const recurringInstances = generateRecurringInstances(
        recurringRules || [],
        startDate,
        endDate,
        regularAppointments || []
      );

      console.log(`Generated ${recurringInstances.length} recurring instances`);

      // 3. Combinar y filtrar por rango de fechas
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

      // 4. Filtrar por rango de fechas y remover duplicados
      const filteredAppointments = allAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.start_time);
        return appointmentDate >= startDate && appointmentDate <= endDate;
      });

      // 5. Remover duplicados por fecha/hora exacta
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
      
      // Debug individual appointments
      if (finalAppointments.length > 0) {
        console.log('Sample appointments:');
        finalAppointments.slice(0, 3).forEach(apt => {
          console.log(`- ${apt.client_name}: ${format(new Date(apt.start_time), 'yyyy-MM-dd HH:mm')} (${apt.status})`);
        });
      } else {
        console.log('⚠️ NO APPOINTMENTS FOUND');
        console.log(`Query range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
        console.log(`Provider ID: ${providerId}`);
      }
      console.log('===============================');

      return finalAppointments;
    },
    staleTime: 60000,
    refetchInterval: false,
    enabled: !!providerId && !rulesLoading
  });

  return {
    data: queryResult.data || [],
    isLoading: queryResult.isLoading || rulesLoading,
    error: queryResult.error
  };
};