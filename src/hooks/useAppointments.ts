
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
          // Para proveedores - obtenemos primero las citas
          const { data: appointments, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('provider_id', user.id)
            .order('start_time');
            
          if (error) {
            console.error("Error fetching provider appointments:", error);
            throw error;
          }
          
          console.log("Provider appointments base data:", appointments);
          
          if (!appointments || appointments.length === 0) {
            console.log("No appointments for provider");
            return [];
          }
          
          // Ahora obtenemos los datos de los servicios (listings)
          const { data: listings } = await supabase
            .from('listings')
            .select('*')
            .in('id', appointments.map(a => a.listing_id));
            
          console.log("Listings data:", listings);
          
          // Obtenemos información de clientes incluyendo condominium info
          const clientIds = appointments.map(a => a.client_id);
          const { data: clients } = await supabase
            .from('users')
            .select(`
              *,
              condominiums:condominium_id (
                id,
                name
              )
            `)
            .in('id', clientIds);
            
          console.log("Clients data with condominiums:", clients);
          
          // Obtenemos información de residencias
          const residenciaIds = appointments.map(a => a.residencia_id).filter(Boolean);
          const { data: residencias } = await supabase
            .from('residencias')
            .select('*')
            .in('id', residenciaIds);
            
          console.log("Residencias data:", residencias);
          
          // Combinar toda la información
          const enhancedData = appointments.map(appointment => {
            const listing = listings?.find(l => l.id === appointment.listing_id) || null;
            const client = clients?.find(c => c.id === appointment.client_id) || null;
            const residencia = residencias?.find(r => r.id === appointment.residencia_id) || null;
            
            return {
              ...appointment,
              listings: listing,
              clients: client,
              residencias: residencia
            };
          });
          
          console.log("Enhanced provider appointments:", enhancedData);
          return enhancedData;
        } 
        else if (user.role === 'client') {
          // Para clientes - mismo enfoque que para proveedores
          const { data: appointments, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('client_id', user.id)
            .order('start_time');
            
          if (error) {
            console.error("Error fetching client appointments:", error);
            throw error;
          }
          
          console.log("Client appointments base data:", appointments);
          
          if (!appointments || appointments.length === 0) {
            console.log("No appointments for client");
            return [];
          }
          
          // Obtenemos datos de servicios
          const { data: listings } = await supabase
            .from('listings')
            .select('*')
            .in('id', appointments.map(a => a.listing_id));
            
          // Obtenemos información de proveedores
          const providerIds = appointments.map(a => a.provider_id);
          const { data: providers } = await supabase
            .from('users')
            .select('*')
            .in('id', providerIds);
            
          // Obtenemos información de residencias
          const residenciaIds = appointments.map(a => a.residencia_id).filter(Boolean);
          const { data: residencias } = await supabase
            .from('residencias')
            .select('*')
            .in('id', residenciaIds);
            
          // Combinar toda la información
          const enhancedData = appointments.map(appointment => {
            const listing = listings?.find(l => l.id === appointment.listing_id) || null;
            const provider = providers?.find(p => p.id === appointment.provider_id) || null;
            const residencia = residencias?.find(r => r.id === appointment.residencia_id) || null;
            
            return {
              ...appointment,
              listings: listing,
              providers: provider,
              residencias: residencia
            };
          });
          
          console.log("Enhanced client appointments:", enhancedData);
          return enhancedData;
        }
        
        return [];
      } catch (error) {
        console.error("Error in appointments query:", error);
        throw error;
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refrescar cada 30 segundos
    retry: 3
  });
}
