
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { processClientBooking } from '@/utils/clientBookingProcessor';
import { logger, bookingLogger, locationLogger } from '@/utils/logger';

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
  supportsPostPayment: boolean;
  isPostPaymentApproved: boolean;
  notes?: string;
  canRate: boolean;
}

export const useClientBookings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-bookings', user?.id],
    queryFn: async (): Promise<ClientBooking[]> => {
      if (!user?.id) return [];

      bookingLogger.info('=== INICIO CONSULTA CLIENT BOOKINGS ===');
      bookingLogger.userAction('Obteniendo reservas para usuario:', user.id);

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
          logger.error('Error obteniendo citas:', error);
          throw error;
        }

        // Filtrar citas saltadas (cancelled con nota especial)
        const filteredAppointments = appointments?.filter(apt => {
          const isSkipped = apt.status === 'cancelled' && apt.notes?.includes('[SKIPPED BY CLIENT]');
          if (isSkipped) {
            bookingLogger.debug(`Cita saltada filtrada: ${apt.id}`);
          }
          return !isSkipped;
        }) || [];

        if (!filteredAppointments?.length) {
          bookingLogger.info('No se encontraron citas para el cliente');
          return [];
        }

        bookingLogger.dataProcessing(`Encontradas ${filteredAppointments.length} citas (${appointments?.length || 0} antes de filtrar saltadas)`);

        // Obtener información de servicios incluyendo is_post_payment
        const listingIds = [...new Set(filteredAppointments.map(a => a.listing_id).filter(Boolean))];
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
            logger.error('Error obteniendo servicios:', error);
          }
        }

        // Obtener información de proveedores
        const providerIds = [...new Set(filteredAppointments.map(a => a.provider_id).filter(Boolean))];
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
            logger.error('Error obteniendo proveedores:', error);
          }
        }

        // Obtener citas calificadas
        const appointmentIds = filteredAppointments.map(a => a.id);
        let ratedIds: Set<string> = new Set();

        try {
          const { data: ratedAppointments } = await supabase
            .rpc('get_rated_appointments', { appointment_ids: appointmentIds });

          if (ratedAppointments) {
            ratedIds = new Set(ratedAppointments.map((r: any) => r.appointment_id));
          }
        } catch (error) {
          logger.error('Error obteniendo calificaciones:', error);
        }

        // Obtener facturas aprobadas para citas post-pago
        let approvedInvoices: Set<string> = new Set();
        const completedPostPaymentAppointments = filteredAppointments.filter(a => {
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
            logger.error('Error obteniendo facturas aprobadas:', error);
          }
        }

        // *** PUNTO CRÍTICO: Obtener datos COMPLETOS del usuario ***
        locationLogger.info('=== OBTENIENDO DATOS COMPLETOS DE UBICACIÓN DEL USUARIO ===');
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
          logger.error('Error obteniendo datos del usuario:', userError);
        }

        locationLogger.debug('=== DATOS COMPLETOS DEL USUARIO ===');
        locationLogger.debug('Objeto completo userData:', JSON.stringify(userData, null, 2));
        locationLogger.debug('Nombre residencia:', userData?.residencias?.name);
        locationLogger.debug('Texto condominio (PRINCIPAL):', userData?.condominium_text);
        locationLogger.debug('Nombre condominio (RESPALDO):', userData?.condominium_name);
        locationLogger.debug('Número de casa:', userData?.house_number);
        locationLogger.debug('=== FIN DATOS USUARIO ===');

        // Procesar citas con cálculo optimizado de próxima ocurrencia
        const processedBookings = filteredAppointments.map(appointment => {
          return processClientBooking({
            appointment,
            servicesMap,
            providersMap,
            ratedIds,
            userData,
            approvedInvoices
          });
        });

        bookingLogger.info('=== RESULTADOS FINALES CLIENT BOOKINGS ===');
        bookingLogger.dataProcessing(`Procesadas ${processedBookings.length} reservas`);

        // *** DEDUPLICACIÓN MEJORADA: Solo eliminar duplicados reales ***
        logger.systemOperation('=== INICIANDO PROCESO DE DEDUPLICACIÓN MEJORADA ===');
        const uniqueBookingsMap = new Map<string, ClientBooking>();
        
        processedBookings.forEach(booking => {
          // Crear clave única incluyendo STATUS para evitar conflictos entre completed/active
          const dateKey = booking.date.toISOString().split('T')[0]; // Solo fecha YYYY-MM-DD
          const timeKey = booking.date.toISOString().split('T')[1].substring(0, 5); // Solo hora HH:MM
          const uniqueKey = `${booking.listingId}-${booking.providerId}-${dateKey}-${timeKey}-${booking.status}`;
          
          logger.debug(`Evaluando cita ${booking.id}: clave=${uniqueKey}, servicio=${booking.serviceName}, status=${booking.status}`);
          
          if (uniqueBookingsMap.has(uniqueKey)) {
            const existingBooking = uniqueBookingsMap.get(uniqueKey)!;
            logger.warn(`DUPLICADO REAL DETECTADO: ${booking.serviceName} el ${dateKey} a las ${timeKey} (${booking.status})`);
            logger.debug(`   - Existente: ID=${existingBooking.id}`);
            logger.debug(`   - Nuevo: ID=${booking.id}`);
            
            // Solo reemplazar si es la misma cita exacta (mismo ID base para recurrentes)
            const existingBaseId = existingBooking.id.split('-recurring-')[0];
            const newBaseId = booking.id.split('-recurring-')[0];
            
            if (existingBaseId === newBaseId || booking.id > existingBooking.id) {
              uniqueBookingsMap.set(uniqueKey, booking);
              logger.debug(`   Cita reemplazada por ser más reciente`);
            } else {
              logger.debug(`   Cita mantenida (IDs diferentes)`);
            }
          } else {
            uniqueBookingsMap.set(uniqueKey, booking);
            logger.debug(`   Cita única agregada`);
          }
        });
        
        const deduplicatedBookings = Array.from(uniqueBookingsMap.values());
        logger.systemOperation(`DEDUPLICACIÓN COMPLETADA: ${processedBookings.length} → ${deduplicatedBookings.length} reservas`);
        
        if (processedBookings.length !== deduplicatedBookings.length) {
          const duplicatesRemoved = processedBookings.length - deduplicatedBookings.length;
          logger.warn(`SE ELIMINARON ${duplicatesRemoved} DUPLICADOS`);
        }
        
        // ORDENAMIENTO CRONOLÓGICO CRÍTICO: Más próxima primero
        deduplicatedBookings.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        
        bookingLogger.info('Reservas finales ordenadas cronológicamente (más próxima primero)');
        deduplicatedBookings.forEach((booking, index) => {
          logger.debug(`${index + 1}. ${booking.serviceName} - ${booking.date.toLocaleString()}`);
        });
        
        return deduplicatedBookings;

      } catch (error) {
        logger.error('Error en useClientBookings:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 3,
    retryDelay: 1000,
  });
};
