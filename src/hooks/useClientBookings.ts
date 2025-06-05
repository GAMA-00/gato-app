
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientBooking {
  id: string;
  serviceName: string;
  subcategory: string;
  date: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  recurrence: string;
  providerId: string;
  providerName: string;
  isRated: boolean;
  location: string;
}

export const useClientBookings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-bookings', user?.id],
    queryFn: async (): Promise<ClientBooking[]> => {
      if (!user?.id) return [];

      // First get appointments with all related data
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          recurrence,
          provider_id,
          client_id,
          apartment,
          listings!inner(
            title,
            service_type_id,
            service_types(name)
          ),
          users!appointments_provider_id_fkey(
            name as provider_name,
            condominium_name,
            house_number
          ),
          residencias(
            name
          )
        `)
        .eq('client_id', user.id)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching client bookings:', error);
        throw error;
      }

      if (!appointments?.length) return [];

      // Get rated appointments
      const appointmentIds = appointments.map(a => a.id);
      const { data: ratedAppointments } = await supabase
        .rpc('get_rated_appointments', { appointment_ids: appointmentIds });

      const ratedIds = new Set(ratedAppointments?.map((r: any) => r.appointment_id) || []);

      return appointments.map(appointment => {
        // Build location string with proper format
        const locationParts = [];
        
        // Add residencia name
        if (appointment.residencias?.name) {
          locationParts.push(appointment.residencias.name);
        }
        
        // Add condominium name from provider's user data
        if ((appointment.users as any)?.condominium_name) {
          locationParts.push((appointment.users as any).condominium_name);
        }
        
        // Add house number
        if (appointment.apartment) {
          locationParts.push(`#${appointment.apartment}`);
        } else if ((appointment.users as any)?.house_number) {
          locationParts.push(`#${(appointment.users as any).house_number}`);
        }

        return {
          id: appointment.id,
          serviceName: appointment.listings?.title || 'Servicio',
          subcategory: appointment.listings?.service_types?.name || 'Servicio',
          date: new Date(appointment.start_time),
          status: appointment.status as ClientBooking['status'],
          recurrence: appointment.recurrence || 'none',
          providerId: appointment.provider_id,
          providerName: (appointment.users as any)?.provider_name || 'Proveedor',
          isRated: ratedIds.has(appointment.id),
          location: locationParts.length > 0 ? locationParts.join(' – ') : 'Ubicación no especificada'
        };
      });
    },
    enabled: !!user?.id,
  });
};
