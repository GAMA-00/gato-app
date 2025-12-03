
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildAppointmentLocation } from "@/utils/appointmentLocationHelper";

interface GroupedRequest {
  id: string;
  recurrence_group_id: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  client_location: string;
  is_external: boolean;
  service_name: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  recurrence: string | null;
  recurrence_label: string | null;
  appointment_count: number;
  appointment_ids: string[];
  listings?: any;
  final_price?: number | null;
  custom_variable_selections?: any;
  custom_variables_total_price?: number | null;
  service_title?: string;
}

export function useGroupedPendingRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['grouped-pending-requests', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'provider') return [];
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          listings (
            id,
            title,
            description,
            base_price,
            duration,
            service_variants,
            custom_variable_groups
          )
        `)
        .eq('provider_id', user.id)
        .eq('status', 'pending')
        .order('start_time');
        
      if (error) {
        throw error;
      }
      
      if (!appointments || appointments.length === 0) {
        return [];
      }
      
      const processedAppointments = await Promise.all(
        (appointments || []).map(async (appointment) => {
          let clientInfo = null;
          let clientLocation = 'Ubicación no especificada';

          if (appointment.client_id) {
            const { data: clientData, error: clientError } = await supabase
              .from('users')
              .select(`
                id,
                name,
                phone,
                email,
                house_number,
                residencia_id,
                condominium_text,
                condominium_name,
                residencias (
                  id,
                  name,
                  address
                )
              `)
              .eq('id', appointment.client_id)
              .eq('role', 'client')
              .single();

            if (!clientError && clientData) {
              clientInfo = clientData;
              
              clientLocation = buildAppointmentLocation({
                appointment,
                clientData
              });
            }
          }

          const isExternal = appointment.external_booking || !appointment.client_id;

          return {
            ...appointment,
            client_name: appointment.client_name || clientInfo?.name || (isExternal 
              ? 'Cliente Externo'
              : 'Cliente sin nombre'),
            client_phone: isExternal 
              ? appointment.client_phone 
              : clientInfo?.phone,
            client_email: isExternal 
              ? appointment.client_email 
              : clientInfo?.email,
            client_location: isExternal 
              ? buildAppointmentLocation({
                  appointment,
                  clientData: null
                })
              : clientLocation,
            is_external: isExternal,
            service_name: appointment.listings?.title || 'Servicio',
            service_title: appointment.listings?.title || 'Servicio',
            recurrence_label: 
              appointment.recurrence === 'weekly' ? 'Semanal' :
              appointment.recurrence === 'biweekly' ? 'Quincenal' :
              appointment.recurrence === 'triweekly' ? 'Trisemanal' :
              appointment.recurrence === 'monthly' ? 'Mensual' :
              appointment.recurrence && appointment.recurrence !== 'none' ? 'Recurrente' : null
          };
        })
      );
      
      const groupedMap = new Map<string, GroupedRequest>();
      
      processedAppointments.forEach(app => {
        const isRecurring = app.recurrence && app.recurrence !== 'none';
        const groupKey = isRecurring && app.recurrence_group_id 
          ? app.recurrence_group_id 
          : app.id;
        
        if (groupedMap.has(groupKey)) {
          const existing = groupedMap.get(groupKey)!;
          existing.appointment_count += 1;
          existing.appointment_ids.push(app.id);
          
          if (new Date(app.start_time) < new Date(existing.start_time)) {
            existing.start_time = app.start_time;
            existing.end_time = app.end_time;
          }
        } else {
          groupedMap.set(groupKey, {
            id: groupKey,
            recurrence_group_id: app.recurrence_group_id,
            client_name: app.client_name,
            client_phone: app.client_phone,
            client_email: app.client_email,
            client_location: app.client_location,
            is_external: app.is_external,
            service_name: app.service_name,
            start_time: app.start_time,
            end_time: app.end_time,
            notes: app.notes,
            recurrence: app.recurrence,
            recurrence_label: app.recurrence_label,
            appointment_count: 1,
            appointment_ids: [app.id],
            listings: app.listings,
            final_price: app.final_price,
            custom_variable_selections: app.custom_variable_selections,
            custom_variables_total_price: app.custom_variables_total_price,
            service_title: app.service_title
          });
        }
      });
      
      return Array.from(groupedMap.values());
    },
    enabled: !!user && user.role === 'provider',
    refetchInterval: 30000,
    retry: 3
  });
}
