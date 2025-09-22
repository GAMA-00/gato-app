
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
  isPostPayment: boolean;
  canRate: boolean;
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
        // Removed auto-rating to prevent active bookings from disappearing
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

        // Obtener información de servicios incluyendo is_post_payment
        const listingIds = [...new Set(appointments.map(a => a.listing_id).filter(Boolean))];
        let servicesMap = new Map();

        if (listingIds.length > 0) {
          try {
            const { data: listings } = await supabase
              .from('listings')
              .select(`
                id,
                title,
                is_post_payment,
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

        // Obtener facturas aprobadas para citas post-pago
        let approvedInvoices: Set<string> = new Set();
        const completedPostPaymentAppointments = appointments.filter(a => {
          const listing = servicesMap.get(a.listing_id);
          return a.status === 'completed' && listing?.is_post_payment;
        });

        if (completedPostPaymentAppointments.length > 0) {
          try {
            const { data: invoices } = await supabase
              .from('post_payment_invoices')
              .select('appointment_id')
              .in('appointment_id', completedPostPaymentAppointments.map(a => a.id))
              .eq('status', 'approved');

            if (invoices) {
              approvedInvoices = new Set(invoices.map(i => i.appointment_id));
            }
          } catch (error) {
            console.error('❌ Error obteniendo facturas aprobadas:', error);
          }
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
            userData,
            approvedInvoices
          });
        });

        console.log('🎯 === RESULTADOS FINALES CLIENT BOOKINGS ===');
        console.log(`📊 Procesadas ${processedBookings.length} reservas`);

        // *** DEDUPLICACIÓN CRÍTICA: Eliminar citas duplicadas ***
        console.log('🔄 === INICIANDO PROCESO DE DEDUPLICACIÓN ===');
        const uniqueBookingsMap = new Map<string, ClientBooking>();
        
        processedBookings.forEach(booking => {
          // Crear clave única: listingId + providerId + fecha ISO + hora
          const dateKey = booking.date.toISOString().split('T')[0]; // Solo fecha YYYY-MM-DD
          const timeKey = booking.date.toISOString().split('T')[1].substring(0, 5); // Solo hora HH:MM
          const uniqueKey = `${booking.listingId}-${booking.providerId}-${dateKey}-${timeKey}`;
          
          console.log(`🔍 Evaluando cita ${booking.id}: clave=${uniqueKey}, servicio=${booking.serviceName}`);
          
          if (uniqueBookingsMap.has(uniqueKey)) {
            const existingBooking = uniqueBookingsMap.get(uniqueKey)!;
            console.log(`⚠️ DUPLICADO DETECTADO: ${booking.serviceName} el ${dateKey} a las ${timeKey}`);
            console.log(`   - Existente: ID=${existingBooking.id}, Recurrencia=${existingBooking.recurrence}`);
            console.log(`   - Nuevo: ID=${booking.id}, Recurrencia=${booking.recurrence}`);
            
            // Priorización: mantener la cita más reciente o con mejor criterio
            // Criterio 1: Citas con recurrence_group_id válido tienen prioridad
            // Criterio 2: Citas con status 'confirmed' sobre 'pending'
            // Criterio 3: Citas más recientes (por ID o fecha de creación)
            let shouldReplace = false;
            
            if (booking.recurrenceGroupId && !existingBooking.recurrenceGroupId) {
              shouldReplace = true;
              console.log('   ✅ Reemplazando: nueva cita tiene recurrence_group_id');
            } else if (booking.status === 'confirmed' && existingBooking.status === 'pending') {
              shouldReplace = true;
              console.log('   ✅ Reemplazando: nueva cita está confirmada');
            } else if (booking.id > existingBooking.id) {
              shouldReplace = true;
              console.log('   ✅ Reemplazando: nueva cita tiene ID más reciente');
            }
            
            if (shouldReplace) {
              uniqueBookingsMap.set(uniqueKey, booking);
              console.log(`   🔄 Cita reemplazada: ${existingBooking.id} → ${booking.id}`);
            } else {
              console.log(`   ⏭️ Cita mantenida: ${existingBooking.id} (descartando ${booking.id})`);
            }
          } else {
            uniqueBookingsMap.set(uniqueKey, booking);
            console.log(`   ✅ Cita única agregada: ${booking.id}`);
          }
        });
        
        const deduplicatedBookings = Array.from(uniqueBookingsMap.values());
        console.log(`🧹 DEDUPLICACIÓN COMPLETADA: ${processedBookings.length} → ${deduplicatedBookings.length} reservas`);
        
        if (processedBookings.length !== deduplicatedBookings.length) {
          const duplicatesRemoved = processedBookings.length - deduplicatedBookings.length;
          console.log(`🚨 SE ELIMINARON ${duplicatesRemoved} DUPLICADOS`);
        }
        
        // ORDENAMIENTO CRONOLÓGICO CRÍTICO: Más próxima primero
        deduplicatedBookings.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        
        console.log('✅ Reservas finales ordenadas cronológicamente (más próxima primero)');
        deduplicatedBookings.forEach((booking, index) => {
          console.log(`${index + 1}. ${booking.serviceName} - ${booking.date.toLocaleString()}`);
        });
        
        return deduplicatedBookings;

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
