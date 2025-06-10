
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, startOfDay, endOfDay } from 'date-fns';
import { useRecurringInstances, useAutoGenerateInstances } from './useRecurringInstances';
import { useEffect } from 'react';

interface UseCalendarAppointmentsWithRecurringProps {
  selectedDate: Date;
  providerId?: string;
}

export const useCalendarAppointmentsWithRecurring = ({ 
  selectedDate, 
  providerId 
}: UseCalendarAppointmentsWithRecurringProps) => {
  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(addWeeks(selectedDate, 24)); // Extendido a 24 semanas

  const autoGenerateInstances = useAutoGenerateInstances();

  // Generar instancias automáticamente al cargar
  useEffect(() => {
    if (providerId) {
      console.log('=== TRIGGERING AUTO-GENERATION ===');
      autoGenerateInstances.mutate();
    }
  }, [providerId]);

  // Generar instancias cada 30 segundos para debug
  useEffect(() => {
    if (!providerId) return;
    
    const interval = setInterval(() => {
      console.log('=== PERIODIC GENERATION ===');
      autoGenerateInstances.mutate();
    }, 30 * 1000); // 30 segundos para debug

    return () => clearInterval(interval);
  }, [providerId, autoGenerateInstances]);

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
    staleTime: 10000,
    refetchInterval: 30000
  });

  // Obtener instancias recurrentes
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
    // Instancias recurrentes - convertir a formato de appointment
    ...recurringInstances.map(instance => {
      const recurringRule = (instance.recurring_rules as any);
      const listings = recurringRule?.listings;
      
      return {
        id: instance.id,
        provider_id: recurringRule?.provider_id,
        client_id: recurringRule?.client_id,
        listing_id: recurringRule?.listing_id,
        start_time: instance.start_time,
        end_time: instance.end_time,
        status: 'confirmed', // Mapear las instancias programadas como confirmadas
        notes: instance.notes || recurringRule?.notes,
        apartment: recurringRule?.apartment,
        client_address: recurringRule?.client_address,
        client_phone: recurringRule?.client_phone,
        client_email: recurringRule?.client_email,
        client_name: recurringRule?.client_name || 'Cliente Recurrente',
        recurring_rule_id: instance.recurring_rule_id,
        is_recurring_instance: true,
        recurrence: recurringRule?.recurrence_type,
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
        // Compatibilidad con estructura de listings
        listings: {
          title: listings?.title || 'Servicio Recurrente',
          duration: listings?.duration || 60
        }
      };
    })
  ];

  // Debug detallado
  console.log('=== CALENDAR APPOINTMENTS DEBUG ===');
  console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
  console.log(`Provider ID: ${providerId}`);
  console.log(`Regular appointments: ${regularAppointments.length}`);
  console.log(`Recurring instances: ${recurringInstances.length}`);
  console.log(`Combined appointments: ${combinedAppointments.length}`);
  console.log(`Loading states - Regular: ${loadingRegular}, Recurring: ${loadingRecurring}`);
  console.log(`Auto-generation status: ${autoGenerateInstances.isPending ? 'running' : 'idle'}`);
  
  // Log instancias recurrentes por fecha
  if (recurringInstances.length > 0) {
    const instancesByDate = recurringInstances.reduce((acc, instance) => {
      const date = instance.instance_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push({
        id: instance.id,
        time: `${format(new Date(instance.start_time), 'HH:mm')}-${format(new Date(instance.end_time), 'HH:mm')}`,
        client: (instance.recurring_rules as any)?.client_name,
        service: (instance.recurring_rules as any)?.listings?.title
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    console.log('Recurring instances by date:', instancesByDate);
  }
  
  console.log('=========================================');

  return {
    data: combinedAppointments,
    isLoading: loadingRegular || loadingRecurring || autoGenerateInstances.isPending,
    regularAppointments,
    recurringInstances,
    conflicts: [] // Simplificado por ahora
  };
};
