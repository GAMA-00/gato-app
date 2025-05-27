
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
          // Para proveedores - incluir todas las citas futuras para mostrar recurrencias
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
            .gte('start_time', new Date().toISOString()) // Solo citas futuras y actuales
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
          
          // Get client names from users table
          const clientIds = [...new Set(appointments.map(app => app.client_id))];
          
          if (clientIds.length > 0) {
            const { data: clients, error: clientsError } = await supabase
              .from('users')
              .select('id, name')
              .in('id', clientIds)
              .eq('role', 'client');
              
            if (!clientsError && clients) {
              const clientNameMap = Object.fromEntries(
                clients.map(client => [client.id, client.name])
              );
              
              appointments.forEach(app => {
                (app as any).client_name = clientNameMap[app.client_id] || `Cliente #${app.client_id.substring(0, 8)}`;
              });
            }
          }
          
          // Mark recurring appointments and add enhanced information
          const enhancedAppointments = appointments.map(app => ({
            ...app,
            is_recurring: app.recurrence && app.recurrence !== 'none',
            recurrence_label: 
              app.recurrence === 'weekly' ? 'Semanal' :
              app.recurrence === 'biweekly' ? 'Quincenal' :
              app.recurrence === 'monthly' ? 'Mensual' :
              app.recurrence && app.recurrence !== 'none' ? 'Recurrente' : null
          }));
          
          console.log(`Returning ${enhancedAppointments.length} appointments, including ${enhancedAppointments.filter(app => app.is_recurring).length} recurring ones`);
          
          return enhancedAppointments;
        } 
        else if (user.role === 'client') {
          // Para clientes - incluir todas las citas futuras
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
            .gte('start_time', new Date().toISOString()) // Solo citas futuras y actuales
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
          
          // Get provider names from users table
          const providerIds = [...new Set(appointments.map(app => app.provider_id))];
          
          if (providerIds.length > 0) {
            const { data: providers, error: providersError } = await supabase
              .from('users')
              .select('id, name')
              .in('id', providerIds)
              .eq('role', 'provider');
              
            if (!providersError && providers) {
              const providerNameMap = Object.fromEntries(
                providers.map(provider => [provider.id, provider.name])
              );
              
              appointments.forEach(app => {
                (app as any).provider_name = providerNameMap[app.provider_id] || `Proveedor #${app.provider_id.substring(0, 8)}`;
              });
            }
          }
          
          // Mark recurring appointments in the response
          const enhancedAppointments = appointments.map(app => ({
            ...app,
            is_recurring: app.recurrence && app.recurrence !== 'none',
            recurrence_label: 
              app.recurrence === 'weekly' ? 'Semanal' :
              app.recurrence === 'biweekly' ? 'Quincenal' :
              app.recurrence === 'monthly' ? 'Mensual' :
              app.recurrence && app.recurrence !== 'none' ? 'Recurrente' : null
          }));
          
          return enhancedAppointments;
        }
        
        return [];
      } catch (error) {
        console.error("Error in appointments query:", error);
        throw error;
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds to show new recurring appointments
    retry: 3
  });
}
