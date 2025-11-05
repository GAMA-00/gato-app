
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { processClientBooking } from '@/utils/clientBookingProcessor';
import { logger, bookingLogger, locationLogger } from '@/utils/logger';
import { useUnifiedRecurringAppointments } from './useUnifiedRecurringAppointments';

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

// Helpers to build robust fallback plan keys
const getTimeParts = (startTime: string) => {
  const d = new Date(startTime);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const dow = d.getDay();
  const dom = d.getDate();
  return { hh, mm, dow, dom };
};

const buildFallbackKey = (a: any): string => {
  const { hh, mm, dow, dom } = getTimeParts(a.start_time);
  const base = `${a.provider_id}-${a.listing_id}`;
  switch (a.recurrence) {
    case 'daily':
      return `${base}-daily-${hh}:${mm}`;
    case 'weekly':
      return `${base}-weekly-${dow}-${hh}:${mm}`;
    case 'biweekly':
      return `${base}-biweekly-${dow}-${hh}:${mm}`;
    case 'triweekly':
      return `${base}-triweekly-${dow}-${hh}:${mm}`;
    case 'monthly':
      return `${base}-monthly-${dom}-${hh}:${mm}`;
    default:
      return `${base}-pattern-${dow}-${hh}:${mm}`;
  }
};

// Helper function to get only the next occurrence of each recurring plan
const getNextRecurringOccurrence = (appointments: any[]): any[] => {
  const now = new Date();
  const validRecurrences = new Set(['daily','weekly','biweekly','triweekly','monthly']);
  
  // Separate recurring from non-recurring
  const recurring = appointments.filter(a => 
    validRecurrences.has(a.recurrence || 'none') && 
    new Date(a.start_time) > now &&
    ['pending', 'confirmed'].includes(a.status)
  );
  
  const nonRecurring = appointments.filter(a => 
    !validRecurrences.has(a.recurrence || 'none')
  );
  
  // Group by recurring plan using original_appointment_id only
  const recurringGroups = new Map<string, any[]>();
  
  recurring.forEach(appointment => {
    const planId = appointment.original_appointment_id || appointment.id;
    
    if (!recurringGroups.has(planId)) {
      recurringGroups.set(planId, []);
    }
    recurringGroups.get(planId)!.push(appointment);
  });
  
  // From each group, take only the next (earliest in time)
  const nextRecurring: any[] = [];
  
  recurringGroups.forEach((group) => {
    // Sort by date and take the first
    const sorted = group.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    nextRecurring.push(sorted[0]);
  });
  
  bookingLogger.info(`📊 Recurring appointments filtered:`, {
    totalRecurring: recurring.length,
    uniquePlans: recurringGroups.size,
    nextOccurrencesShown: nextRecurring.length,
    nonRecurring: nonRecurring.length,
    finalTotal: nextRecurring.length + nonRecurring.length
  });
  
  return [...nextRecurring, ...nonRecurring];
};

export const useClientBookings = () => {
  const { user } = useAuth();
  
  // Limit date range to 90 days to optimize instance generation
  const endDate = React.useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() + 90);
    return end;
  }, []);
  
  // Use unified recurring appointments system for consistency with calendar
  const { data: unifiedAppointments = [], isLoading: isLoadingUnified } = useUnifiedRecurringAppointments({
    userId: user?.id,
    userRole: 'client',
    includeCompleted: true,
    endDate: endDate,
  });

  return useQuery({
    queryKey: ['client-bookings', user?.id, unifiedAppointments.length],
    queryFn: async (): Promise<ClientBooking[]> => {
      if (!user?.id) return [];

      bookingLogger.info('=== INICIO CONSULTA CLIENT BOOKINGS (UNIFIED SYSTEM) ===');
      bookingLogger.userAction('Procesando reservas unificadas para usuario:', user.id);

      try {
        // Use unified appointments (real + virtual recurring instances)
        const appointments = unifiedAppointments;

        // Filtrar citas saltadas (cancelled con nota especial)
        const filteredAppointments = appointments.filter(apt => {
          const isSkipped = apt.status === 'cancelled' && apt.notes?.includes('[SKIPPED BY CLIENT]');
          if (isSkipped) {
            bookingLogger.debug(`Cita saltada filtrada: ${apt.id}`);
          }
          return !isSkipped;
        });

        if (!filteredAppointments.length) {
          bookingLogger.info('No se encontraron citas para el cliente');
          return [];
        }

        bookingLogger.dataProcessing(`Procesando ${filteredAppointments.length} citas unificadas (${appointments.length} antes de filtrar saltadas)`);

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

        // ENRICH: Add original_appointment_id to materialized instances
        bookingLogger.info('=== ENRIQUECIENDO INSTANCIAS MATERIALIZADAS ===');
        
        // Fetch all base appointments to match materialized instances
        const { data: baseAppointmentsForMatching } = await supabase
          .from('appointments')
          .select('id, provider_id, listing_id, recurrence, start_time')
          .eq('is_recurring_instance', false)
          .in('recurrence', ['daily', 'weekly', 'biweekly', 'triweekly', 'monthly']);

        // Create map with recurrence-specific key (includes dow/dom when applicable)
        const baseAppointmentMap = new Map<string, string>();
        const makeKey = (recurrence: string, start: string, providerId: string, listingId: string) => {
          const dt = new Date(start);
          const hh = dt.getHours();
          const mm = dt.getMinutes();
          const dow = dt.getDay();
          const dom = dt.getDate();
          const base = `${providerId}-${listingId}`;
          switch (recurrence) {
            case 'daily':
              return `${base}-daily-${hh}-${mm}`;
            case 'weekly':
            case 'biweekly':
            case 'triweekly':
              return `${base}-${recurrence}-${dow}-${hh}-${mm}`;
            case 'monthly':
              return `${base}-monthly-${dom}-${hh}-${mm}`;
            default:
              return `${base}-pattern-${dow}-${hh}-${mm}`;
          }
        };
        baseAppointmentsForMatching?.forEach(base => {
          const key = makeKey(base.recurrence, base.start_time, base.provider_id, base.listing_id);
          baseAppointmentMap.set(key, base.id);
        });

        bookingLogger.debug(`Mapa de bases creado: ${baseAppointmentMap.size} entradas`);

        // Enrich appointments with original_appointment_id
        const enrichedAppointments = filteredAppointments.map(apt => {
          if (apt.original_appointment_id) {
            // Already has it (virtual instance)
            return apt;
          }
          
          // Materialized instance - find its base
          const key = makeKey(apt.recurrence, apt.start_time, apt.provider_id, apt.listing_id);
          const baseId = baseAppointmentMap.get(key);
          
          if (baseId) {
            bookingLogger.debug(`Instancia materializada ${apt.id} vinculada a base ${baseId}`);
          }
          
          return {
            ...apt,
            original_appointment_id: baseId || apt.id // Fallback to own ID if no base found
          };
        });

        bookingLogger.info(`Enriquecimiento completado: ${enrichedAppointments.filter(a => a.original_appointment_id).length} appointments con original_appointment_id`);

        // FILTER: Show only next occurrence of each recurring plan
        const filteredForDisplay = getNextRecurringOccurrence(
          enrichedAppointments.filter(a => !['cancelled', 'rejected'].includes(a.status))
        );
        
        bookingLogger.info(`📋 Appointments after filtering next occurrences: ${filteredForDisplay.length} (from ${filteredAppointments.length} total)`);

        // Procesar citas unificadas
        const processedBookings = filteredForDisplay.map(appointment => {
          return processClientBooking({
            appointment: {
              ...appointment,
              // Ensure date is properly formatted for processing
              start_time: appointment.start_time,
              end_time: appointment.end_time,
            },
            servicesMap,
            providersMap,
            ratedIds,
            userData,
            approvedInvoices
          });
        });

        bookingLogger.info('=== RESULTADOS FINALES CLIENT BOOKINGS ===');
        bookingLogger.dataProcessing(`Procesadas ${processedBookings.length} reservas`);

        // CRITICAL: Unified deduplication logic (same as useUnifiedAppointments)
        // Key format: dateTime-providerId-clientId-listingId (without status to prevent duplicates)
        logger.systemOperation('=== INICIANDO DEDUPLICACIÓN UNIFICADA ===');
        const uniqueBookingsMap = new Map<string, ClientBooking>();
        
        processedBookings.forEach(booking => {
          // Create time slot key matching unified system
          const timeSlotKey = `${booking.date.toISOString()}-${booking.providerId}-${user.id}-${booking.listingId}`;
          
          logger.debug(`Evaluando cita ${booking.id}: clave=${timeSlotKey}, servicio=${booking.serviceName}, status=${booking.status}`);
          
          const existingBooking = uniqueBookingsMap.get(timeSlotKey);
          
          if (!existingBooking) {
            uniqueBookingsMap.set(timeSlotKey, booking);
            logger.debug(`   Cita única agregada`);
          } else {
            logger.warn(`DUPLICADO DETECTADO: ${booking.serviceName} - ${booking.date.toISOString()}`);
            logger.debug(`   - Existente: ID=${existingBooking.id}, recurring=${existingBooking.isRecurringInstance}`);
            logger.debug(`   - Nuevo: ID=${booking.id}, recurring=${booking.isRecurringInstance}`);
            
            // Priority: regular appointment > recurring instance
            const isRegular = !booking.isRecurringInstance;
            const existingIsRegular = !existingBooking.isRecurringInstance;
            
            if (isRegular && !existingIsRegular) {
              uniqueBookingsMap.set(timeSlotKey, booking);
              logger.debug(`   Reemplazado por appointment regular`);
            } else if (isRegular === existingIsRegular) {
              // Same type, keep most recent by creation
              if (booking.date >= existingBooking.date) {
                uniqueBookingsMap.set(timeSlotKey, booking);
                logger.debug(`   Reemplazado por ser más reciente`);
              }
            } else {
              logger.debug(`   Mantenido (existing es regular)`);
            }
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
    enabled: !!user?.id && !isLoadingUnified,
    retry: 3,
    retryDelay: 1000,
  });
};
