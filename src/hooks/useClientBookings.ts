
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatTo12Hour } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type ClientBooking = {
  id: string;
  serviceName: string;
  subcategory: string;
  providerName: string;
  buildingName: string;
  date: Date;
  duration: number;
  recurrence: string;
  status: string;
};

export function useClientBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-bookings', user?.id],
    queryFn: async (): Promise<ClientBooking[]> => {
      if (!user) return [];
      
      console.log("Fetching bookings for client:", user.id);
      
      try {
        // Fetch appointments for the client
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            end_time,
            recurrence,
            status,
            listing_id,
            provider_id,
            residencia_id,
            notes
          `)
          .eq('client_id', user.id)
          .order('start_time');
          
        if (error) {
          console.error("Error fetching client appointments:", error);
          throw error;
        }
        
        console.log("Raw client appointments:", appointments);
        
        if (!appointments || appointments.length === 0) {
          return [];
        }
        
        // Fetch related listing data
        const { data: listings } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            duration,
            service_type_id,
            provider_id
          `)
          .in('id', appointments.map(a => a.listing_id));
        
        console.log("Listings data:", listings);
        
        // Fetch service types for subcategories
        const { data: serviceTypes } = await supabase
          .from('service_types')
          .select('*')
          .in('id', listings?.map(l => l.service_type_id) || []);
          
        console.log("Service types:", serviceTypes);
        
        // Fetch provider info
        const providerIds = appointments.map(a => a.provider_id);
        const { data: providers } = await supabase
          .from('users')
          .select('id, name')
          .in('id', providerIds);
          
        console.log("Providers data:", providers);
        
        // Fetch buildings/residencias info
        const residenciaIds = appointments.map(a => a.residencia_id).filter(Boolean);
        const { data: residencias } = await supabase
          .from('residencias')
          .select('id, name')
          .in('id', residenciaIds);
          
        console.log("Residencias data:", residencias);
        
        // Transform the data to match our UI requirements
        const clientBookings = appointments.map(appointment => {
          const listing = listings?.find(l => l.id === appointment.listing_id);
          const serviceType = serviceTypes?.find(st => st.id === listing?.service_type_id);
          const provider = providers?.find(p => p.id === appointment.provider_id);
          const residencia = residencias?.find(r => r.id === appointment.residencia_id);
          
          return {
            id: appointment.id,
            serviceName: listing?.title || 'Servicio sin nombre',
            subcategory: serviceType?.name || 'Sin categoría',
            providerName: provider?.name || 'Proveedor desconocido',
            buildingName: residencia?.name || 'Edificio no especificado',
            date: new Date(appointment.start_time),
            duration: listing?.duration || 60,
            recurrence: appointment.recurrence || 'none',
            status: appointment.status
          };
        });
        
        console.log("Processed client bookings:", clientBookings);
        return clientBookings;
      } catch (error) {
        console.error("Error in client bookings query:", error);
        throw error;
      }
    },
    enabled: !!user
  });
}
