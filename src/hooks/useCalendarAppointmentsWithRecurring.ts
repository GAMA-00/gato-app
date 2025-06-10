
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
  const endDate = endOfDay(addWeeks(selectedDate, 20)); // Extendido a 20 semanas

  const autoGenerateInstances = useAutoGenerateInstances();

  // Generar instancias automáticamente al cargar y cada vez que cambie el proveedor
  useEffect(() => {
    if (providerId) {
      console.log('Auto-generating instances for provider:', providerId);
      autoGenerateInstances.mutate();
    }
  }, [providerId]);

  // Generar instancias periódicamente para mantener el calendario actualizado
  useEffect(() => {
    const interval = setInterval(() => {
      if (providerId) {
        console.log('Periodic instance generation...');
        autoGenerateInstances.mutate();
      }
    }, 2 * 60 * 1000); // Cada 2 minutos

    return () => clearInterval(interval);
  }, [providerId, autoGenerateInstances]);

  // Obtener citas regulares
  const { data: regularAppointments = [], isLoading: loadingRegular } = useQuery({
    queryKey: ['calendar-appointments', format(selectedDate, 'yyyy-MM-dd'), providerId],
    queryFn: async () => {
      console.log('Fetching regular appointments for extended calendar...');
      
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
    staleTime: 30000,
    refetchInterval: 60000
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
        status: instance.status === 'scheduled' ? 'confirmed' : instance.status, // Mapear scheduled a confirmed para visualización
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

  // Detectar conflictos mejorado
  const conflictDetection = () => {
    const conflicts = [];
    for (let i = 0; i < combinedAppointments.length; i++) {
      for (let j = i + 1; j < combinedAppointments.length; j++) {
        const apt1 = combinedAppointments[i];
        const apt2 = combinedAppointments[j];
        
        if (apt1.provider_id === apt2.provider_id) {
          const start1 = new Date(apt1.start_time);
          const end1 = new Date(apt1.end_time);
          const start2 = new Date(apt2.start_time);
          const end2 = new Date(apt2.end_time);
          
          if (start1 < end2 && start2 < end1) {
            conflicts.push({ apt1: apt1.id, apt2: apt2.id });
            console.warn('CONFLICT DETECTED:', {
              appointment1: { 
                id: apt1.id, 
                start: format(start1, 'yyyy-MM-dd HH:mm'), 
                end: format(end1, 'yyyy-MM-dd HH:mm'), 
                type: apt1.is_recurring_instance ? 'recurring' : 'regular' 
              },
              appointment2: { 
                id: apt2.id, 
                start: format(start2, 'yyyy-MM-dd HH:mm'), 
                end: format(end2, 'yyyy-MM-dd HH:mm'), 
                type: apt2.is_recurring_instance ? 'recurring' : 'regular' 
              }
            });
          }
        }
      }
    }
    return conflicts;
  };

  // Debug log mejorado
  console.log('=== ENHANCED CALENDAR APPOINTMENTS DEBUG ===');
  console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
  console.log(`Regular appointments: ${regularAppointments.length}`);
  console.log(`Recurring instances: ${recurringInstances.length}`);
  console.log(`Combined appointments: ${combinedAppointments.length}`);
  console.log(`Loading states - Regular: ${loadingRegular}, Recurring: ${loadingRecurring}`);
  console.log(`Auto-generation running: ${autoGenerateInstances.isPending}`);
  
  // Log details of recurring instances by week
  if (recurringInstances.length > 0) {
    const instancesByWeek = recurringInstances.reduce((acc, instance) => {
      const week = format(new Date(instance.instance_date), 'yyyy-MM-dd');
      if (!acc[week]) acc[week] = [];
      acc[week].push(instance);
      return acc;
    }, {} as Record<string, any[]>);
    
    console.log('Recurring instances by week:', Object.keys(instancesByWeek).map(week => ({
      week,
      count: instancesByWeek[week].length,
      instances: instancesByWeek[week].map(i => ({
        id: i.id,
        start: format(new Date(i.start_time), 'HH:mm'),
        end: format(new Date(i.end_time), 'HH:mm'),
        status: i.status
      }))
    })));
  }
  
  console.log('=======================================');

  return {
    data: combinedAppointments,
    isLoading: loadingRegular || loadingRecurring || autoGenerateInstances.isPending,
    regularAppointments,
    recurringInstances,
    conflicts: conflictDetection()
  };
};
