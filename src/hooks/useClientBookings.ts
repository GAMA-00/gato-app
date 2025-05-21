
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
        // Fetch appointments for the client without JOIN to avoid foreign key errors
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
            provider_name,
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
          
          // Refresh appointments after updates
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
              provider_name,
              residencia_id,
              notes
            `)
            .eq('client_id', user.id)
            .order('start_time');
            
          if (!refreshError && refreshedAppointments) {
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
        
        // Get provider names where they're missing
        const appointmentsWithMissingProviderNames = appointments.filter(a => 
          !a.provider_name
        );
        
        if (appointmentsWithMissingProviderNames.length > 0) {
          console.log("Appointments with missing provider names:", appointmentsWithMissingProviderNames.length);
          
          // Get unique provider IDs where names are missing
          const providerIdsToFetch = [...new Set(
            appointmentsWithMissingProviderNames.map(a => a.provider_id)
          )];
          
          if (providerIdsToFetch.length > 0) {
            console.log("Provider IDs to fetch:", providerIdsToFetch);
            
            // Try to fetch from providers table first
            const { data: providerDetails, error: providersError } = await supabase
              .from('providers')
              .select('id, name')
              .in('id', providerIdsToFetch);
              
            if (!providersError && providerDetails && providerDetails.length > 0) {
              console.log("Found provider details:", providerDetails);
              
              // Create a map of provider ID to name
              const providerNameMap = Object.fromEntries(
                providerDetails.map(provider => [provider.id, provider.name])
              );
              
              // Apply names to appointments
              appointments.forEach(app => {
                if (!app.provider_name && app.provider_id && providerNameMap[app.provider_id]) {
                  app.provider_name = providerNameMap[app.provider_id];
                  console.log(`Updated provider name from providers table for appointment ${app.id} to ${app.provider_name}`);
                }
              });
            } else {
              console.log("No provider details found in providers table, trying users table");
              
              // Fallback: Try to fetch from users table
              const { data: userDetails, error: usersError } = await supabase
                .from('users')
                .select('id, name')
                .in('id', providerIdsToFetch);
                
              if (!usersError && userDetails && userDetails.length > 0) {
                console.log("Found user details:", userDetails);
                
                // Create a map of user ID to name
                const userNameMap = Object.fromEntries(
                  userDetails.map(user => [user.id, user.name])
                );
                
                // Apply names to appointments
                appointments.forEach(app => {
                  if (!app.provider_name && app.provider_id && userNameMap[app.provider_id]) {
                    app.provider_name = userNameMap[app.provider_id];
                    console.log(`Updated provider name from users table for appointment ${app.id} to ${app.provider_name}`);
                  }
                });
              }
            }
          }
        }
        
        // Fetch buildings/residencias info
        const residenciaIds = appointments.map(a => a.residencia_id).filter(Boolean);
        const { data: residencias } = await supabase
          .from('residencias')
          .select('id, name')
          .in('id', residenciaIds);
          
        console.log("Residencias data:", residencias);
        
        // Get rated appointments
        let ratedAppointmentIds = new Set<string>();
        const appointmentIds = appointments.map(a => a.id);
        
        try {
          // Use rpc function with proper type casting
          const { data, error } = await supabase
            .rpc('get_rated_appointments', { 
              appointment_ids: appointmentIds 
            }) as { 
              data: { appointment_id: string }[] | null, 
              error: Error | null 
            };
          
          if (!error && data) {
            // Create a set of appointment IDs that have been rated
            ratedAppointmentIds = new Set(data.map(item => item.appointment_id));
            console.log("Rated appointments:", ratedAppointmentIds);
          } else {
            console.log("Could not get ratings:", error);
          }
        } catch (err) {
          console.log("Error checking for ratings:", err);
          // Continue without ratings data
        }
        
        // Transform the data to match our UI requirements
        const clientBookings = appointments.map(appointment => {
          const listing = listings?.find(l => l.id === appointment.listing_id);
          const serviceType = serviceTypes?.find(st => st.id === listing?.service_type_id);
          const residencia = residencias?.find(r => r.id === appointment.residencia_id);
          const isRated = ratedAppointmentIds.has(appointment.id);
          
          // Make one final check for provider name presence
          const finalProviderName = appointment.provider_name || 'Proveedor desconocido';
          
          console.log(`Final provider name for appointment ${appointment.id}: ${finalProviderName}`);
          
          return {
            id: appointment.id,
            serviceName: listing?.title || 'Servicio sin nombre',
            subcategory: serviceType?.name || 'Sin categoría',
            providerName: finalProviderName,
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
