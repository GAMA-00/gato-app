
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildCompleteLocation } from '@/utils/locationBuilder';

export interface ClientBooking {
  id: string;
  serviceName: string;
  subcategory: string;
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
                service_types(name)
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
        let ratedIds = new Set();

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

        // Procesar citas con cálculo de próxima ocurrencia real
        const processedBookings = appointments.map(appointment => {
          const service = servicesMap.get(appointment.listing_id);
          const provider = providersMap.get(appointment.provider_id);
          
          console.log(`🔄 === PROCESANDO CITA ${appointment.id} ===`);
          
          let location = 'Ubicación no especificada';
          
          if (appointment.external_booking && appointment.client_address) {
            console.log('🌍 Reserva externa detectada');
            location = buildCompleteLocation({
              clientAddress: appointment.client_address,
              isExternal: true
            }, appointment.id);
          } else if (userData) {
            console.log('🏠 Construyendo ubicación interna con datos COMPLETOS');
            
            const locationData = {
              residenciaName: userData.residencias?.name,
              condominiumText: userData.condominium_text,
              condominiumName: userData.condominium_name,
              houseNumber: userData.house_number,
              isExternal: false
            };
            
            console.log('📤 === DATOS ENVIADOS A buildCompleteLocation ===');
            console.log('📋 Datos completos:', JSON.stringify(locationData, null, 2));
            
            location = buildCompleteLocation(locationData, appointment.id);
          } else {
            console.log('❌ NO HAY DATOS DE USUARIO para construcción de ubicación');
          }

          console.log(`📍 Ubicación final para cita ${appointment.id}:`, location);

          // CALCULAR PRÓXIMA FECHA DE OCURRENCIA REAL
          let nextOccurrenceDate = new Date(appointment.start_time);
          const now = new Date();
          
          if (appointment.recurrence && appointment.recurrence !== 'none' && appointment.recurrence !== '') {
            console.log(`📅 Calculando próxima ocurrencia para cita recurrente: ${appointment.recurrence}`);
            
            // Para citas recurrentes, calcular la próxima fecha de ocurrencia
            const appointmentTime = new Date(appointment.start_time);
            const currentTime = appointmentTime.getHours() * 60 + appointmentTime.getMinutes();
            
            if (appointment.recurrence === 'weekly') {
              const dayOfWeek = appointmentTime.getDay(); // 0 = domingo, 1 = lunes, etc.
              let nextDate = new Date(now);
              nextDate.setHours(appointmentTime.getHours(), appointmentTime.getMinutes(), 0, 0);
              
              // Encontrar el próximo día de la semana
              const daysUntilNext = (dayOfWeek - nextDate.getDay() + 7) % 7;
              if (daysUntilNext === 0 && nextDate <= now) {
                // Si es hoy pero ya pasó la hora, programar para la próxima semana
                nextDate.setDate(nextDate.getDate() + 7);
              } else {
                nextDate.setDate(nextDate.getDate() + daysUntilNext);
              }
              
              nextOccurrenceDate = nextDate;
              console.log(`⏰ Próxima ocurrencia semanal: ${nextOccurrenceDate.toLocaleString()}`);
              
            } else if (appointment.recurrence === 'biweekly') {
              // Lógica similar para quincenal
              const dayOfWeek = appointmentTime.getDay();
              let nextDate = new Date(now);
              nextDate.setHours(appointmentTime.getHours(), appointmentTime.getMinutes(), 0, 0);
              
              // Encontrar la próxima fecha que coincida con el patrón quincenal
              const daysUntilNext = (dayOfWeek - nextDate.getDay() + 7) % 7;
              nextDate.setDate(nextDate.getDate() + daysUntilNext);
              
              // Verificar si cae en la semana correcta del patrón quincenal
              const diffWeeks = Math.floor((nextDate.getTime() - appointmentTime.getTime()) / (7 * 24 * 60 * 60 * 1000));
              if (diffWeeks % 2 !== 0) {
                nextDate.setDate(nextDate.getDate() + 7);
              }
              
              if (nextDate <= now) {
                nextDate.setDate(nextDate.getDate() + 14);
              }
              
              nextOccurrenceDate = nextDate;
              console.log(`⏰ Próxima ocurrencia quincenal: ${nextOccurrenceDate.toLocaleString()}`);
              
            } else if (appointment.recurrence === 'monthly') {
              const dayOfMonth = appointmentTime.getDate();
              let nextDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
              nextDate.setHours(appointmentTime.getHours(), appointmentTime.getMinutes(), 0, 0);
              
              if (nextDate <= now) {
                nextDate.setMonth(nextDate.getMonth() + 1);
              }
              
              nextOccurrenceDate = nextDate;
              console.log(`⏰ Próxima ocurrencia mensual: ${nextOccurrenceDate.toLocaleString()}`);
            }
          } else {
            // Para citas únicas, usar la fecha original
            console.log(`📅 Cita única, usando fecha original: ${nextOccurrenceDate.toLocaleString()}`);
          }

          return {
            id: appointment.id,
            serviceName: service?.title || 'Servicio',
            subcategory: service?.service_types?.name || 'Servicio',
            date: nextOccurrenceDate, // USAR LA PRÓXIMA FECHA DE OCURRENCIA CALCULADA
            status: appointment.status as ClientBooking['status'],
            recurrence: appointment.recurrence || 'none',
            providerId: appointment.provider_id,
            providerName: provider?.name || appointment.provider_name || 'Proveedor',
            isRated: ratedIds.has(appointment.id),
            location,
            isRescheduled: appointment.notes?.includes('Reagendado'),
            originalRecurrenceGroupId: appointment.recurrence_group_id,
            listingId: appointment.listing_id,
            recurrenceGroupId: appointment.recurrence_group_id,
            isRecurringInstance: appointment.is_recurring_instance || false,
            originalAppointmentId: appointment.is_recurring_instance ? appointment.id.split('-recurring-')[0] : undefined
          };
        });

        console.log('🎯 === RESULTADOS FINALES CLIENT BOOKINGS ===');
        console.log(`📊 Procesadas ${processedBookings.length} reservas con ubicaciones:`);
        processedBookings.forEach(booking => {
          console.log(`📍 Reserva ${booking.id}: "${booking.location}"`);
        });
        
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
