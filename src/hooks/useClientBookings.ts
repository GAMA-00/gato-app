
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { processClientBooking } from '@/utils/clientBookingProcessor';

export interface ClientBooking {
  id: string;
  serviceName: string;
  subcategory: string;
  categoryId: string;
  date: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected' | 'rescheduled';
  recurrence: string;
  providerId: string;
  providerName: string;
  isRated: boolean;
  location: string;
  isRescheduled?: boolean;
  originalRecurrenceGroupId?: string;
  listingId?: string;
  recurrenceGroupId?: string;
  isRecurringInstance?: boolean;
  originalAppointmentId?: string;
}

export const useClientBookings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-bookings', user?.id],
    queryFn: async (): Promise<ClientBooking[]> => {
      if (!user?.id) return [];

      console.log('🚀 === INICIO CONSULTA CLIENT BOOKINGS ===');
      console.log('👤 Obteniendo reservas para usuario:', user.id);

      try {
        // Obtener citas básicas
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
            external_booking,
            client_address,
            listing_id,
            recurrence_group_id,
            notes,
            is_recurring_instance,
            provider_name,
            client_name
          `)
          .eq('client_id', user.id)
          .in('status', ['pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'rescheduled'])
          .order('start_time', { ascending: false });

        if (error) {
          console.error('❌ Error obteniendo citas:', error);
          throw error;
        }

        if (!appointments?.length) {
          console.log('📭 No se encontraron citas para el cliente');
          return [];
        }

        console.log(`📊 Encontradas ${appointments.length} citas`);

        // Obtener información de servicios
        const listingIds = [...new Set(appointments.map(a => a.listing_id).filter(Boolean))];
        let servicesMap = new Map();

        if (listingIds.length > 0) {
          try {
            const { data: listings } = await supabase
              .from('listings')
              .select(`
                id,
                title,
                service_type_id,
                service_types(
                  name,
                  category_id,
                  service_categories(id, name)
                )
              `)
              .in('id', listingIds);

            if (listings) {
              servicesMap = new Map(listings.map(l => [l.id, l]));
            }
          } catch (error) {
            console.error('❌ Error obteniendo servicios:', error);
          }
        }

        // Obtener información de proveedores
        const providerIds = [...new Set(appointments.map(a => a.provider_id).filter(Boolean))];
        let providersMap = new Map();

        if (providerIds.length > 0) {
          try {
            const { data: providers } = await supabase
              .from('users')
              .select('id, name')
              .in('id', providerIds);

            if (providers) {
              providersMap = new Map(providers.map(p => [p.id, p]));
            }
          } catch (error) {
            console.error('❌ Error obteniendo proveedores:', error);
          }
        }

        // Obtener citas calificadas
        const appointmentIds = appointments.map(a => a.id);
        let ratedIds: Set<string> = new Set();

        try {
          const { data: ratedAppointments } = await supabase
            .rpc('get_rated_appointments', { appointment_ids: appointmentIds });

          if (ratedAppointments) {
            ratedIds = new Set(ratedAppointments.map((r: any) => r.appointment_id));
          }
        } catch (error) {
          console.error('❌ Error obteniendo calificaciones:', error);
        }

        // *** PUNTO CRÍTICO: Obtener datos COMPLETOS del usuario ***
        console.log('🏠 === OBTENIENDO DATOS COMPLETOS DE UBICACIÓN DEL USUARIO ===');
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            house_number,
            condominium_text,
            condominium_name,
            residencia_id,
            residencias (
              id,
              name
            )
          `)
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('❌ Error obteniendo datos del usuario:', userError);
        }

        console.log('🏠 === DATOS COMPLETOS DEL USUARIO ===');
        console.log('📋 Objeto completo userData:', JSON.stringify(userData, null, 2));
        console.log('🏢 Nombre residencia:', userData?.residencias?.name);
        console.log('🏘️ Texto condominio (PRINCIPAL):', userData?.condominium_text);
        console.log('🏘️ Nombre condominio (RESPALDO):', userData?.condominium_name);
        console.log('🏠 Número de casa:', userData?.house_number);
        console.log('🏠 === FIN DATOS USUARIO ===');

        // Procesar citas con cálculo optimizado de próxima ocurrencia
        const processedBookings = appointments.map(appointment => {
          return processClientBooking({
            appointment,
            servicesMap,
            providersMap,
            ratedIds,
            userData
          });
        });

        console.log('🎯 === RESULTADOS FINALES CLIENT BOOKINGS ===');
        console.log(`📊 Procesadas ${processedBookings.length} reservas`);
        
        // ORDENAMIENTO CRONOLÓGICO CRÍTICO: Más próxima primero
        processedBookings.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        
        console.log('✅ Reservas ordenadas cronológicamente (más próxima primero)');
        processedBookings.forEach((booking, index) => {
          console.log(`${index + 1}. ${booking.serviceName} - ${booking.date.toLocaleString()}`);
        });
        
        return processedBookings;

      } catch (error) {
        console.error('❌ Error en useClientBookings:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 3,
    retryDelay: 1000,
  });
};
