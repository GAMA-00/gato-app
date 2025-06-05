
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
          residencia_id,
          external_booking,
          client_address,
          listings!inner(
            title,
            service_type_id,
            service_types(name)
          ),
          users!appointments_provider_id_fkey(
            name,
            condominium_name,
            house_number,
            residencia_id,
            condominium_id
          )
        `)
        .eq('client_id', user.id)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching client bookings:', error);
        throw error;
      }

      if (!appointments?.length) return [];

      // Get all unique residencia and condominium IDs for batch fetching
      const residenciaIds = [...new Set(
        appointments
          .map(a => a.residencia_id || (a.users as any)?.residencia_id)
          .filter(Boolean)
      )];
      
      const condominiumIds = [...new Set(
        appointments
          .map(a => (a.users as any)?.condominium_id)
          .filter(id => id && !id.startsWith('static-'))
      )];

      // Batch fetch residencias
      let residenciasMap = new Map();
      if (residenciaIds.length > 0) {
        const { data: residencias } = await supabase
          .from('residencias')
          .select('id, name, address')
          .in('id', residenciaIds);
        
        if (residencias) {
          residenciasMap = new Map(residencias.map(r => [r.id, r]));
        }
      }

      // Batch fetch condominiums
      let condominiumsMap = new Map();
      if (condominiumIds.length > 0) {
        const { data: condominiums } = await supabase
          .from('condominiums')
          .select('id, name')
          .in('id', condominiumIds);
        
        if (condominiums) {
          condominiumsMap = new Map(condominiums.map(c => [c.id, c]));
        }
      }

      // Get rated appointments
      const appointmentIds = appointments.map(a => a.id);
      const { data: ratedAppointments } = await supabase
        .rpc('get_rated_appointments', { appointment_ids: appointmentIds });

      const ratedIds = new Set(ratedAppointments?.map((r: any) => r.appointment_id) || []);

      return appointments.map(appointment => {
        // Build complete location string
        const buildLocationString = () => {
          if (appointment.external_booking) {
            return appointment.client_address || 'Ubicación externa';
          }

          const parts = [];
          
          // Add residencia name
          const residenciaId = appointment.residencia_id || (appointment.users as any)?.residencia_id;
          const residencia = residenciasMap.get(residenciaId);
          if (residencia?.name) {
            parts.push(residencia.name);
          }
          
          // Add condominium name
          const condominiumId = (appointment.users as any)?.condominium_id;
          const condominium = condominiumsMap.get(condominiumId);
          const condominiumName = condominium?.name || (appointment.users as any)?.condominium_name;
          if (condominiumName) {
            parts.push(condominiumName);
          }
          
          // Add house number
          const houseNumber = appointment.apartment || (appointment.users as any)?.house_number;
          if (houseNumber) {
            parts.push(`#${houseNumber}`);
          }

          return parts.length > 0 ? parts.join(' – ') : 'Ubicación no especificada';
        };

        return {
          id: appointment.id,
          serviceName: appointment.listings?.title || 'Servicio',
          subcategory: appointment.listings?.service_types?.name || 'Servicio',
          date: new Date(appointment.start_time),
          status: appointment.status as ClientBooking['status'],
          recurrence: appointment.recurrence || 'none',
          providerId: appointment.provider_id,
          providerName: (appointment.users as any)?.name || 'Proveedor',
          isRated: ratedIds.has(appointment.id),
          location: buildLocationString()
        };
      });
    },
    enabled: !!user?.id,
  });
};
