import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, addWeeks } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';

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
  // Rango extendido: 2 semanas atrás, 16 semanas adelante
  const startDate = startOfDay(addWeeks(selectedDate, -2));
  const endDate = endOfDay(addWeeks(selectedDate, 16));

  return useQuery({
    queryKey: ['recurring-slot-system', format(selectedDate, 'yyyy-MM-dd'), providerId, clientId],
    queryFn: async () => {
      const appointments: RecurringSlotAppointment[] = [];

      // 1. Obtener citas regulares
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

        // Procesar citas regulares
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

      // 2. Obtener slots bloqueados por recurrencia (estos representan las citas recurrentes)
      let blockedSlotsQuery = supabase
        .from('provider_time_slots')
        .select(`
          *,
          recurring_rules(
            client_id,
            provider_id,
            listing_id,
            client_name,
            client_address,
            client_phone,
            client_email,
            notes,
            recurrence_type
          ),
          listings(title)
        `)
        .eq('recurring_blocked', true)
        .eq('is_available', false)
        .gte('slot_datetime_start', startDate.toISOString())
        .lte('slot_datetime_start', endDate.toISOString())
        .order('slot_datetime_start', { ascending: true });

      if (providerId) {
        blockedSlotsQuery = blockedSlotsQuery.eq('provider_id', providerId);
      }

      if (clientId) {
        blockedSlotsQuery = blockedSlotsQuery.eq('recurring_rules.client_id', clientId);
      }

      const { data: blockedSlots, error: slotsError } = await blockedSlotsQuery;

      if (slotsError) {
        console.error('❌ Error fetching blocked slots:', slotsError);
        throw slotsError;
      }

      // Procesar slots bloqueados como citas recurrentes
      (blockedSlots || []).forEach(slot => {
        if (slot.recurring_rules) {
          appointments.push({
            id: `recurring-slot-${slot.id}`,
            provider_id: slot.provider_id,
            client_id: slot.recurring_rules.client_id,
            listing_id: slot.listing_id,
            start_time: slot.slot_datetime_start,
            end_time: slot.slot_datetime_end,
            status: 'confirmed',
            recurrence: slot.recurring_rules.recurrence_type,
            client_name: slot.recurring_rules.client_name || 'Cliente',
            service_title: slot.listings?.title || 'Servicio',
            notes: slot.recurring_rules.notes,
            is_recurring_instance: true,
            recurring_rule_id: slot.recurring_rule_id,
            complete_location: buildAppointmentLocation({
              appointment: {
                client_address: slot.recurring_rules.client_address,
                external_booking: false
              },
              clientData: null
            }),
            external_booking: false,
            recurring_blocked: true
          });
        }
      });

      // 3. Eliminar duplicados dando prioridad a citas regulares sobre slots bloqueados
      const uniqueAppointments = appointments.reduce((acc, appointment) => {
        const key = `${appointment.provider_id}-${appointment.start_time}-${appointment.end_time}`;
        
        if (!acc.has(key)) {
          acc.set(key, appointment);
        } else {
          const existing = acc.get(key);
          
          // Prioridad: cita regular > slot bloqueado
          if (existing.recurring_blocked && !appointment.recurring_blocked) {
            acc.set(key, appointment);
            console.log(`🔄 Replaced blocked slot with regular appointment for ${appointment.start_time}`);
          } else if (!existing.recurring_blocked && appointment.recurring_blocked) {
            console.log(`⚠️ Keeping regular appointment over blocked slot for ${appointment.start_time}`);
          }
        }
        
        return acc;
      }, new Map());

      const finalAppointments = Array.from(uniqueAppointments.values());

      console.log(`📅 Loaded ${finalAppointments.length} appointments (${appointments.length - finalAppointments.length} duplicates removed)`);
      
      return finalAppointments;
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: false,
    enabled: !!(providerId || clientId),
    refetchOnWindowFocus: true
  });
};

// Hook específico para obtener la próxima cita de un cliente
export const useNextClientAppointment = (clientId?: string) => {
  return useQuery({
    queryKey: ['next-client-appointment', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const now = new Date().toISOString();

      // Buscar la próxima cita regular
      const { data: regularAppointment } = await supabase
        .from('appointments')
        .select(`
          *,
          listings(title, duration)
        `)
        .eq('client_id', clientId)
        .in('status', ['pending', 'confirmed', 'scheduled'])
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(1);

      // Buscar el próximo slot bloqueado
      const { data: blockedSlot } = await supabase
        .from('provider_time_slots')
        .select(`
          *,
          recurring_rules(
            client_id,
            provider_id,
            listing_id,
            client_name,
            client_address,
            client_phone,
            client_email,
            notes,
            recurrence_type
          ),
          listings(title)
        `)
        .eq('recurring_blocked', true)
        .eq('recurring_rules.client_id', clientId)
        .gte('slot_datetime_start', now)
        .order('slot_datetime_start', { ascending: true })
        .limit(1);

      // Determinar cuál es más próximo
      let nextAppointment = null;

      if (regularAppointment?.[0] && blockedSlot?.[0]) {
        const regularTime = new Date(regularAppointment[0].start_time).getTime();
        const blockedTime = new Date(blockedSlot[0].slot_datetime_start).getTime();
        
        if (regularTime <= blockedTime) {
          nextAppointment = {
            ...regularAppointment[0],
            service_title: regularAppointment[0].listings?.title || 'Servicio',
            is_recurring_blocked: false
          };
        } else {
          nextAppointment = {
            id: `recurring-slot-${blockedSlot[0].id}`,
            provider_id: blockedSlot[0].provider_id,
            client_id: blockedSlot[0].recurring_rules?.client_id,
            listing_id: blockedSlot[0].listing_id,
            start_time: blockedSlot[0].slot_datetime_start,
            end_time: blockedSlot[0].slot_datetime_end,
            status: 'confirmed',
            recurrence: blockedSlot[0].recurring_rules?.recurrence_type,
            client_name: blockedSlot[0].recurring_rules?.client_name || 'Cliente',
            service_title: blockedSlot[0].listings?.title || 'Servicio',
            notes: blockedSlot[0].recurring_rules?.notes,
            is_recurring_instance: true,
            recurring_rule_id: blockedSlot[0].recurring_rule_id,
            is_recurring_blocked: true
          };
        }
      } else if (regularAppointment?.[0]) {
        nextAppointment = {
          ...regularAppointment[0],
          service_title: regularAppointment[0].listings?.title || 'Servicio',
          is_recurring_blocked: false
        };
      } else if (blockedSlot?.[0] && blockedSlot[0].recurring_rules) {
        nextAppointment = {
          id: `recurring-slot-${blockedSlot[0].id}`,
          provider_id: blockedSlot[0].provider_id,
          client_id: blockedSlot[0].recurring_rules.client_id,
          listing_id: blockedSlot[0].listing_id,
          start_time: blockedSlot[0].slot_datetime_start,
          end_time: blockedSlot[0].slot_datetime_end,
          status: 'confirmed',
          recurrence: blockedSlot[0].recurring_rules.recurrence_type,
          client_name: blockedSlot[0].recurring_rules.client_name || 'Cliente',
          service_title: blockedSlot[0].listings?.title || 'Servicio',
          notes: blockedSlot[0].recurring_rules.notes,
          is_recurring_instance: true,
          recurring_rule_id: blockedSlot[0].recurring_rule_id,
          is_recurring_blocked: true
        };
      }

      return nextAppointment;
    },
    staleTime: 30 * 1000,
    enabled: !!clientId
  });
};