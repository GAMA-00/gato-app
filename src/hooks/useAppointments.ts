
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function useAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Fetching appointments for user:", user.id, "with role:", user.role);
      
      try {
        if (user.role === 'provider') {
          // For providers - fetch appointments with client_name directly from DB column
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
              ),
              residencias (
                id,
                name,
                address
              )
            `)
            .eq('provider_id', user.id)
            .order('start_time');
            
          if (error) {
            console.error("Error fetching provider appointments:", error);
            throw error;
          }
          
          console.log("Provider appointments full data:", appointments);
          
          if (!appointments || appointments.length === 0) {
            console.log("No appointments for provider");
            return [];
          }
          
          // If client_name is missing in any appointment, try to fetch it
          const appointmentsWithMissingNames = appointments.filter(app => !app.client_name);
          if (appointmentsWithMissingNames.length > 0) {
            console.log("Found appointments with missing client names, fetching...");
            
            // Get unique client IDs with missing names
            const clientIdsToFetch = [...new Set(appointmentsWithMissingNames.map(app => app.client_id))];
            
            // Fetch client names
            const { data: clients } = await supabase
              .from('users')
              .select('id, name')
              .in('id', clientIdsToFetch);
              
            if (clients && clients.length > 0) {
              // Create a map of client IDs to names
              const clientNameMap = Object.fromEntries(
                clients.map(client => [client.id, client.name])
              );
              
              // Apply names to appointments
              appointments.forEach(app => {
                if (!app.client_name && clientNameMap[app.client_id]) {
                  app.client_name = clientNameMap[app.client_id];
                }
              });
            }
          }
          
          return appointments;
        } 
        else if (user.role === 'client') {
          // For clients - fetch appointments with provider_name directly from DB column
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
              ),
              residencias (
                id,
                name,
                address
              )
            `)
            .eq('client_id', user.id)
            .order('start_time');
            
          if (error) {
            console.error("Error fetching client appointments:", error);
            throw error;
          }
          
          console.log("Client appointments full data:", appointments);
          
          if (!appointments || appointments.length === 0) {
            console.log("No appointments for client");
            return [];
          }
          
          // If provider_name is missing in any appointment, try to fetch it
          const appointmentsWithMissingNames = appointments.filter(app => !app.provider_name);
          if (appointmentsWithMissingNames.length > 0) {
            console.log("Found appointments with missing provider names, fetching...");
            
            // Get unique provider IDs with missing names
            const providerIdsToFetch = [...new Set(appointmentsWithMissingNames.map(app => app.provider_id))];
            
            // Fetch provider names
            const { data: providers } = await supabase
              .from('users')
              .select('id, name')
              .in('id', providerIdsToFetch);
              
            if (providers && providers.length > 0) {
              // Create a map of provider IDs to names
              const providerNameMap = Object.fromEntries(
                providers.map(provider => [provider.id, provider.name])
              );
              
              // Apply names to appointments
              appointments.forEach(app => {
                if (!app.provider_name && providerNameMap[app.provider_id]) {
                  app.provider_name = providerNameMap[app.provider_id];
                }
              });
            }
          }
          
          return appointments;
        }
        
        return [];
      } catch (error) {
        console.error("Error in appointments query:", error);
        throw error;
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3
  });
}
