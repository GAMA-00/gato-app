
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
}

export function useGroupedPendingRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['grouped-pending-requests', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'provider') return [];
      
      console.log("Fetching grouped pending requests for provider:", user.id);
      
      try {
        // Get all pending appointments for this provider using the same query structure as useAppointments
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(`
            *,
            listings (
              id,
              title,
              description,
              base_price,
              duration
            )
          `)
          .eq('provider_id', user.id)
          .eq('status', 'pending')
          .order('start_time');
          
        if (error) {
          console.error("Error fetching pending appointments:", error);
          throw error;
        }
        
        if (!appointments || appointments.length === 0) {
          console.log("No pending appointments found");
          return [];
        }
        
        console.log("Raw pending appointments:", appointments);
        
        // Process appointments to add client/provider information (same logic as useAppointments)
        const processedAppointments = await Promise.all(
          (appointments || []).map(async (appointment) => {
            let clientInfo = null;
            let clientLocation = 'Ubicación no especificada';

            // Get client information including residencia
            if (appointment.client_id) {
              const { data: clientData } = await supabase
                .from('users')
                .select(`
                  id,
                  name,
                  phone,
                  email,
                  house_number,
                  residencia_id,
                  condominium_text,
                  residencias!inner(
                    id,
                    name
                  )
                `)
                .eq('id', appointment.client_id)
                .eq('role', 'client')
                .single();

              if (clientData) {
                clientInfo = clientData;
                
                // Build location string
                const locationParts = [];
                
                if (clientData.residencias?.name) {
                  locationParts.push(clientData.residencias.name);
                }
                
                if (clientData.condominium_text) {
                  locationParts.push(clientData.condominium_text);
                }
                
                if (clientData.house_number) {
                  locationParts.push(clientData.house_number);
                }
                
                clientLocation = locationParts.length > 0 
                  ? locationParts.join(' – ') 
                  : 'Ubicación no especificada';
              }
            }

            // Handle external bookings
            const isExternal = appointment.external_booking || !appointment.client_id;

            return {
              ...appointment,
              client_name: isExternal 
                ? (appointment.client_name || 'Cliente Externo')
                : (clientInfo?.name || 'Cliente sin nombre'),
              client_phone: isExternal 
                ? appointment.client_phone 
                : clientInfo?.phone,
              client_email: isExternal 
                ? appointment.client_email 
                : clientInfo?.email,
              client_location: isExternal 
                ? (appointment.client_address || 'Ubicación no especificada')
                : clientLocation,
              is_external: isExternal,
              service_name: appointment.listings?.title || 'Servicio',
              recurrence_label: 
                appointment.recurrence === 'weekly' ? 'Semanal' :
                appointment.recurrence === 'biweekly' ? 'Quincenal' :
                appointment.recurrence === 'monthly' ? 'Mensual' :
                appointment.recurrence && appointment.recurrence !== 'none' ? 'Recurrente' : null
            };
          })
        );
        
        console.log("Processed pending appointments:", processedAppointments);
        
        // Group appointments by recurrence_group_id or treat as individual
        const groupedMap = new Map<string, GroupedRequest>();
        
        processedAppointments.forEach(app => {
          const isRecurring = app.recurrence && app.recurrence !== 'none';
          const groupKey = isRecurring && app.recurrence_group_id 
            ? app.recurrence_group_id 
            : app.id; // Use appointment ID for non-recurring appointments
          
          if (groupedMap.has(groupKey)) {
            const existing = groupedMap.get(groupKey)!;
            existing.appointment_count += 1;
            existing.appointment_ids.push(app.id);
            
            // Use the earliest start time for the group
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
              appointment_ids: [app.id]
            });
          }
        });
        
        const groupedRequests = Array.from(groupedMap.values());
        
        console.log(`Returning ${groupedRequests.length} grouped requests`);
        console.log(`  - Recurring groups: ${groupedRequests.filter(req => req.appointment_count > 1).length}`);
        console.log(`  - Individual appointments: ${groupedRequests.filter(req => req.appointment_count === 1).length}`);
        
        return groupedRequests;
        
      } catch (error) {
        console.error("Error in grouped pending requests query:", error);
        throw error;
      }
    },
    enabled: !!user && user.role === 'provider',
    refetchInterval: 30000,
    retry: 3
  });
}
