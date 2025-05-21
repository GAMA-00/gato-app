
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
          // Para proveedores - usamos un JOIN directo con la tabla users para obtener nombres de clientes
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
              ),
              client:client_id (
                id,
                name,
                email,
                phone
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
          
          // Aplicar los nombres de cliente desde el JOIN
          appointments.forEach(app => {
            if (app.client && app.client.name) {
              app.client_name = app.client.name;
              console.log(`Set client name from JOIN for appointment ${app.id}: ${app.client_name}`);
            } else {
              console.log(`No client JOIN data for appointment ${app.id}, client_id: ${app.client_id}`);
            }
          });
          
          // Intentar buscar nombres faltantes como respaldo
          const appointmentsWithMissingNames = appointments.filter(app => !app.client_name);
          
          if (appointmentsWithMissingNames.length > 0) {
            console.log("Still missing names after JOIN, trying direct query:", appointmentsWithMissingNames.length);
            
            // Intentar con una consulta directa a la tabla users
            const clientIdsToFetch = [...new Set(appointmentsWithMissingNames.map(app => app.client_id))];
            console.log("Client IDs to fetch directly:", clientIdsToFetch);
            
            try {
              const { data: clients, error: directQueryError } = await supabase
                .from('users')  // Consultar tabla users en lugar de clients
                .select('id, name')
                .in('id', clientIdsToFetch);
                
              if (directQueryError) {
                console.error("Error in direct query for client names:", directQueryError);
              } else {
                console.log("Direct query result for clients:", clients);
                
                if (clients && clients.length > 0) {
                  const clientNameMap = Object.fromEntries(
                    clients.map(client => [client.id, client.name])
                  );
                  
                  console.log("Client name map from direct query:", clientNameMap);
                  
                  appointments.forEach(app => {
                    if (!app.client_name && app.client_id && clientNameMap[app.client_id]) {
                      app.client_name = clientNameMap[app.client_id];
                      console.log(`Updated client name from direct query for appointment ${app.id} to ${app.client_name}`);
                    }
                  });
                } else {
                  console.log("No clients found in direct query");
                }
              }
            } catch (fetchError) {
              console.error("Exception during direct client query:", fetchError);
            }
          }
          
          // Última opción: establecer un nombre por defecto para los que siguen sin nombre
          appointments.forEach(app => {
            if (!app.client_name && app.client_id) {
              // Intentar usar al menos el ID como referencia
              app.client_name = `Cliente #${app.client_id.substring(0, 8)}`;
              console.log(`Using fallback name for client ID ${app.client_id} in appointment ${app.id}`);
            }
          });
          
          return appointments;
        } 
        else if (user.role === 'client') {
          // Para clientes - JOIN con la tabla users para obtener nombres de proveedores
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
              ),
              provider:provider_id (
                id,
                name,
                email,
                phone
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
          
          // Aplicar los nombres de proveedor desde el JOIN
          appointments.forEach(app => {
            if (app.provider && app.provider.name) {
              app.provider_name = app.provider.name;
              console.log(`Set provider name from JOIN for appointment ${app.id}: ${app.provider_name}`);
            } else {
              console.log(`No provider JOIN data for appointment ${app.id}, provider_id: ${app.provider_id}`);
            }
          });
          
          // Procedimiento similar como respaldo para proveedores sin nombre
          const appointmentsWithMissingNames = appointments.filter(app => !app.provider_name);
          
          if (appointmentsWithMissingNames.length > 0) {
            // Intentar con una consulta directa a users
            try {
              const providerIdsToFetch = [...new Set(appointmentsWithMissingNames.map(app => app.provider_id))];
              
              const { data: providers, error: directQueryError } = await supabase
                .from('users')  // Consultar users en lugar de providers
                .select('id, name')
                .in('id', providerIdsToFetch);
                
              if (directQueryError) {
                console.error("Error in direct query for provider names:", directQueryError);
              } else if (providers && providers.length > 0) {
                const providerNameMap = Object.fromEntries(
                  providers.map(provider => [provider.id, provider.name])
                );
                
                appointments.forEach(app => {
                  if (!app.provider_name && app.provider_id && providerNameMap[app.provider_id]) {
                    app.provider_name = providerNameMap[app.provider_id];
                    console.log(`Updated provider name from direct query for appointment ${app.id} to ${app.provider_name}`);
                  }
                });
              }
            } catch (fetchError) {
              console.error("Exception during direct provider query:", fetchError);
            }
          }
          
          // Último recurso para proveedores sin nombre
          appointments.forEach(app => {
            if (!app.provider_name && app.provider_id) {
              app.provider_name = `Proveedor #${app.provider_id.substring(0, 8)}`;
              console.log(`Using fallback name for provider ID ${app.provider_id} in appointment ${app.id}`);
            }
          });
          
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
