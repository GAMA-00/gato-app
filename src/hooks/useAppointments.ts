
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
          // Para proveedores - obtenemos citas con información del cliente
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
          
          console.log("Provider appointments data:", appointments);
          
          if (!appointments || appointments.length === 0) {
            console.log("No appointments for provider");
            return [];
          }
          
          // Si faltan nombres de clientes, obtenerlos explícitamente de la tabla users
          const appointmentsWithMissingNames = appointments.filter(app => !app.client_name);
          
          if (appointmentsWithMissingNames.length > 0) {
            console.log("Found appointments with missing client names:", appointmentsWithMissingNames.length);
            
            // Obtener los IDs únicos de clientes con nombres faltantes
            const clientIdsToFetch = [...new Set(appointmentsWithMissingNames.map(app => app.client_id))];
            console.log("Client IDs to fetch:", clientIdsToFetch);
            
            // Buscar información de los clientes directamente
            const { data: clients, error: clientsError } = await supabase
              .from('users')
              .select('id, name')
              .in('id', clientIdsToFetch);
              
            if (clientsError) {
              console.error("Error fetching client names:", clientsError);
            } else {
              console.log("Found client data:", clients);
              
              if (clients && clients.length > 0) {
                // Crear un mapa de ID de cliente a nombre
                const clientNameMap = Object.fromEntries(
                  clients.map(client => [client.id, client.name])
                );
                
                console.log("Client name map:", clientNameMap);
                
                // Aplicar nombres a las citas
                appointments.forEach(app => {
                  if (!app.client_name && app.client_id && clientNameMap[app.client_id]) {
                    app.client_name = clientNameMap[app.client_id];
                    console.log(`Updated client name for appointment ${app.id} to ${app.client_name}`);
                  } else if (!app.client_name && app.client_id) {
                    console.log(`No name found for client ID ${app.client_id} in appointment ${app.id}`);
                  }
                });
              } else {
                console.log("No client data found for the missing names");
              }
            }
          }
          
          return appointments;
        } 
        else if (user.role === 'client') {
          // Para clientes - obtener citas con información del proveedor
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
          
          console.log("Client appointments data:", appointments);
          
          if (!appointments || appointments.length === 0) {
            console.log("No appointments for client");
            return [];
          }
          
          // Si faltan nombres de proveedores, obtenerlos explícitamente
          const appointmentsWithMissingNames = appointments.filter(app => !app.provider_name);
          if (appointmentsWithMissingNames.length > 0) {
            console.log("Found appointments with missing provider names:", appointmentsWithMissingNames.length);
            
            // Obtener IDs únicos de proveedores con nombres faltantes
            const providerIdsToFetch = [...new Set(appointmentsWithMissingNames.map(app => app.provider_id))];
            console.log("Provider IDs to fetch:", providerIdsToFetch);
            
            // Buscar información de los proveedores directamente
            const { data: providers, error: providersError } = await supabase
              .from('users')
              .select('id, name')
              .in('id', providerIdsToFetch);
              
            if (providersError) {
              console.error("Error fetching provider names:", providersError);
            } else {
              console.log("Found provider data:", providers);
              
              if (providers && providers.length > 0) {
                // Crear un mapa de ID de proveedor a nombre
                const providerNameMap = Object.fromEntries(
                  providers.map(provider => [provider.id, provider.name])
                );
                
                console.log("Provider name map:", providerNameMap);
                
                // Aplicar nombres a las citas
                appointments.forEach(app => {
                  if (!app.provider_name && app.provider_id && providerNameMap[app.provider_id]) {
                    app.provider_name = providerNameMap[app.provider_id];
                    console.log(`Updated provider name for appointment ${app.id} to ${app.provider_name}`);
                  } else if (!app.provider_name && app.provider_id) {
                    console.log(`No name found for provider ID ${app.provider_id} in appointment ${app.id}`);
                  }
                });
              } else {
                console.log("No provider data found for the missing names");
              }
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
