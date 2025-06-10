
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
  const endDate = endOfDay(addWeeks(selectedDate, 16)); // Próximas 16 semanas

  const autoGenerateInstances = useAutoGenerateInstances();

  // Generar instancias automáticamente al cargar
  useEffect(() => {
    if (providerId) {
      console.log('Auto-generating instances for provider:', providerId);
      autoGenerateInstances.mutate();
    }
  }, [providerId, selectedDate]);

  // Obtener citas regulares
  const { data: regularAppointments = [], isLoading: loadingRegular } = useQuery({
    queryKey: ['calendar-appointments', format(selectedDate, 'yyyy-MM-dd'), providerId],
    queryFn: async () => {
      console.log('Fetching regular appointments for calendar...');
      
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
    staleTime: 60000,
    refetchInterval: 120000
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
      service_title: (appointment.listings as any)?.title || 'Servicio'
    })),
    // Instancias recurrentes - convertir a formato de appointment
    ...recurringInstances.map(instance => ({
      id: instance.id,
      provider_id: (instance.recurring_rules as any)?.provider_id,
      client_id: (instance.recurring_rules as any)?.client_id,
      listing_id: (instance.recurring_rules as any)?.listing_id,
      start_time: instance.start_time,
      end_time: instance.end_time,
      status: instance.status === 'scheduled' ? 'confirmed' : instance.status, // Mapear status
      notes: instance.notes || (instance.recurring_rules as any)?.notes,
      apartment: (instance.recurring_rules as any)?.apartment,
      client_address: (instance.recurring_rules as any)?.client_address,
      client_phone: (instance.recurring_rules as any)?.client_phone,
      client_email: (instance.recurring_rules as any)?.client_email,
      client_name: (instance.recurring_rules as any)?.client_name || 'Cliente',
      recurring_rule_id: instance.recurring_rule_id,
      is_recurring_instance: true,
      recurrence: (instance.recurring_rules as any)?.recurrence_type,
      service_title: ((instance.recurring_rules as any)?.listings as any)?.title || 'Servicio Recurrente',
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
        title: ((instance.recurring_rules as any)?.listings as any)?.title || 'Servicio Recurrente',
        duration: ((instance.recurring_rules as any)?.listings as any)?.duration || 60
      }
    }))
  ];

  // Detectar conflictos
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
              appointment1: { id: apt1.id, start: start1, end: end1, type: apt1.is_recurring_instance ? 'recurring' : 'regular' },
              appointment2: { id: apt2.id, start: start2, end: end2, type: apt2.is_recurring_instance ? 'recurring' : 'regular' }
            });
          }
        }
      }
    }
    return conflicts;
  };

  // Debug log
  console.log('=== CALENDAR APPOINTMENTS DEBUG ===');
  console.log(`Regular appointments: ${regularAppointments.length}`);
  console.log(`Recurring instances: ${recurringInstances.length}`);
  console.log(`Combined appointments: ${combinedAppointments.length}`);
  console.log(`Loading states - Regular: ${loadingRegular}, Recurring: ${loadingRecurring}`);
  console.log(`Auto-generation running: ${autoGenerateInstances.isPending}`);
  console.log('=====================================');

  return {
    data: combinedAppointments,
    isLoading: loadingRegular || loadingRecurring || autoGenerateInstances.isPending,
    regularAppointments,
    recurringInstances,
    conflicts: conflictDetection()
  };
};
