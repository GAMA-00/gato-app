
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
        // Get all pending appointments for this provider
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
        
        // Get client information for internal bookings
        const clientIds = [...new Set(appointments
          .filter(app => !app.external_booking && app.client_id)
          .map(app => app.client_id))];
        
        let clientNameMap: Record<string, string> = {};
        let clientLocationMap: Record<string, any> = {};
        
        if (clientIds.length > 0) {
          const { data: clients, error: clientsError } = await supabase
            .from('users')
            .select(`
              id, 
              name, 
              house_number,
              residencia_id,
              condominium_text
            `)
            .in('id', clientIds)
            .eq('role', 'client');
            
          if (!clientsError && clients) {
            clientNameMap = Object.fromEntries(
              clients.map(client => [client.id, client.name])
            );
            
            // Get residencias data
            const residenciaIds = [...new Set(clients
              .map(client => client.residencia_id)
              .filter(Boolean))];
            
            let residenciasMap: Record<string, string> = {};
            if (residenciaIds.length > 0) {
              const { data: residencias, error: residenciasError } = await supabase
                .from('residencias')
                .select('id, name')
                .in('id', residenciaIds);
              
              if (residencias && !residenciasError) {
                residenciasMap = Object.fromEntries(
                  residencias.map(res => [res.id, res.name])
                );
              }
            }
            
            // Create location map
            clientLocationMap = Object.fromEntries(
              clients.map(client => {
                const residenciaName = client.residencia_id ? residenciasMap[client.residencia_id] : '';
                const condominiumName = client.condominium_text || '';
                const houseNumber = client.house_number || '';
                
                const locationParts = [];
                
                if (residenciaName && residenciaName.trim()) {
                  locationParts.push(residenciaName.trim());
                }
                
                if (condominiumName && condominiumName.trim()) {
                  locationParts.push(condominiumName.trim());
                }
                
                if (houseNumber && houseNumber.trim()) {
                  locationParts.push(houseNumber.trim());
                }
                
                const finalLocation = locationParts.length > 0 
                  ? locationParts.join(' – ') 
                  : 'Ubicación no especificada';
                
                return [client.id, finalLocation];
              })
            );
          }
        }
        
        // Process appointments and add client info
        const processedAppointments = appointments.map(app => {
          const isExternal = !!app.external_booking;
          
          let clientName = 'Cliente sin nombre';
          let clientLocation = 'Ubicación no especificada';
          
          if (isExternal) {
            clientName = app.client_name || 'Cliente Externo';
            clientLocation = app.client_address || 'Ubicación no especificada';
          } else {
            clientName = clientNameMap[app.client_id] || `Cliente #${app.client_id?.substring(0, 8) || 'N/A'}`;
            clientLocation = clientLocationMap[app.client_id] || 'Ubicación no especificada';
          }
          
          return {
            ...app,
            client_name: clientName,
            client_location: clientLocation,
            is_external: isExternal,
            service_name: app.listings?.title || 'Servicio',
            recurrence_label: 
              app.recurrence === 'weekly' ? 'Semanal' :
              app.recurrence === 'biweekly' ? 'Quincenal' :
              app.recurrence === 'monthly' ? 'Mensual' :
              app.recurrence && app.recurrence !== 'none' ? 'Recurrente' : null
          };
        });
        
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
