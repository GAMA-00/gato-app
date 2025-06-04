
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientBooking {
  id: string;
  serviceName: string;
  subcategory: string;
  date: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  providerId: string;
  providerName: string;
  recurrence: string;
  isRated: boolean;
}

export function useClientBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-bookings', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'client') return [];

      console.log("Fetching client bookings for user:", user.id);

      // Get appointments for this client - including ALL statuses
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          listings (
            id,
            title,
            description,
            service_type_id,
            service_types (
              id,
              name,
              category_id,
              service_categories (
                id,
                name,
                label
              )
            )
          )
        `)
        .eq('client_id', user.id)
        .order('start_time', { ascending: false });

      if (error) {
        console.error("Error fetching client bookings:", error);
        throw error;
      }

      if (!appointments || appointments.length === 0) {
        console.log("No appointments found for client");
        return [];
      }

      console.log("Raw client appointments:", appointments);

      // Get all appointment IDs to check for ratings
      const appointmentIds = appointments.map(app => app.id);
      const { data: ratedAppointments } = await supabase
        .rpc('get_rated_appointments', { appointment_ids: appointmentIds });

      const ratedAppointmentIds = new Set(
        ratedAppointments?.map(rating => rating.appointment_id) || []
      );

      // Get provider information for all appointments
      const providerIds = [...new Set(appointments.map(app => app.provider_id))];
      const { data: providers } = await supabase
        .from('users')
        .select('id, name')
        .in('id', providerIds)
        .eq('role', 'provider');

      const providerMap = new Map(
        providers?.map(provider => [provider.id, provider.name]) || []
      );

      // Process the appointments
      const processedBookings: ClientBooking[] = appointments.map(appointment => {
        const serviceName = appointment.listings?.title || 
                           appointment.listings?.service_types?.name || 
                           'Servicio';
        
        const subcategory = appointment.listings?.service_types?.service_categories?.label ||
                           appointment.listings?.service_types?.service_categories?.name ||
                           'Categoría no especificada';

        const providerName = providerMap.get(appointment.provider_id) || 'Proveedor desconocido';

        return {
          id: appointment.id,
          serviceName,
          subcategory,
          date: new Date(appointment.start_time),
          status: appointment.status as ClientBooking['status'],
          providerId: appointment.provider_id,
          providerName,
          recurrence: appointment.recurrence || 'none',
          isRated: ratedAppointmentIds.has(appointment.id)
        };
      });

      console.log("Processed client bookings:", processedBookings);
      return processedBookings;
    },
    enabled: !!user && user.role === 'client',
    refetchInterval: 10000, // Reduce interval to 10 seconds for faster updates
    retry: 3
  });
}
