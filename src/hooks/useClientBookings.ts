
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
  providerId: string;
  buildingName: string;
  date: Date;
  duration: number;
  recurrence: string;
  status: string;
  isRated: boolean;
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
        
        // Auto-update status of appointments that have ended but are still marked as confirmed
        const now = new Date();
        const appointmentsToUpdate = appointments.filter(
          a => a.status === 'confirmed' && new Date(a.end_time) < now
        );
        
        // If we have appointments that need to be marked as completed
        if (appointmentsToUpdate.length > 0) {
          console.log("Appointments to mark as completed:", appointmentsToUpdate);
          
          // Update appointments status in batch
          for (const appointment of appointmentsToUpdate) {
            const { error: updateError } = await supabase
              .from('appointments')
              .update({ status: 'completed' })
              .eq('id', appointment.id);
              
            if (updateError) {
              console.error("Error updating appointment status:", updateError);
            }
          }
          
          // Fetch the appointments again after updates
          const { data: refreshedAppointments, error: refreshError } = await supabase
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
            
          if (!refreshError) {
            appointments.forEach((appointment, i) => {
              const updated = refreshedAppointments?.find(a => a.id === appointment.id);
              if (updated) {
                appointments[i] = updated;
              }
            });
          }
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
        
        // Get rated appointments using a raw query to check if each appointment has a rating
        // Instead of directly querying the provider_ratings table (which TypeScript doesn't know about yet)
        const appointmentIds = appointments.map(a => a.id);
        
        // First check if we can query the table (safely handle the case where the table doesn't exist yet)
        let ratedAppointmentIds = new Set<string>();
        
        try {
          const { data: ratingData, error: ratingError } = await supabase.rpc('get_rated_appointments', {
            appointment_ids: appointmentIds
          });
          
          if (!ratingError && ratingData) {
            ratedAppointmentIds = new Set(ratingData.map((r: any) => r.appointment_id));
          } else {
            console.log("Could not get ratings, possibly table doesn't exist yet:", ratingError);
          }
        } catch (err) {
          console.log("Error checking for ratings:", err);
          // Continue without ratings data
        }
        
        // Transform the data to match our UI requirements
        const clientBookings = appointments.map(appointment => {
          const listing = listings?.find(l => l.id === appointment.listing_id);
          const serviceType = serviceTypes?.find(st => st.id === listing?.service_type_id);
          const provider = providers?.find(p => p.id === appointment.provider_id);
          const residencia = residencias?.find(r => r.id === appointment.residencia_id);
          const isRated = ratedAppointmentIds.has(appointment.id);
          
          return {
            id: appointment.id,
            serviceName: listing?.title || 'Servicio sin nombre',
            subcategory: serviceType?.name || 'Sin categoría',
            providerName: provider?.name || 'Proveedor desconocido',
            providerId: appointment.provider_id,
            buildingName: residencia?.name || 'Edificio no especificado',
            date: new Date(appointment.start_time),
            duration: listing?.duration || 60,
            recurrence: appointment.recurrence || 'none',
            status: appointment.status,
            isRated
          };
        });
        
        console.log("Processed client bookings:", clientBookings);
        return clientBookings;
      } catch (error) {
        console.error("Error in client bookings query:", error);
        throw error;
      }
    },
    enabled: !!user,
    refetchInterval: 60000 // Refetch every minute to update statuses
  });
}
