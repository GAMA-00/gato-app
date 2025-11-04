import { ClientBooking } from '@/hooks/useClientBookings';
import { buildCompleteLocation } from '@/utils/locationBuilder';
import { calculateNextOccurrence } from '@/utils/nextOccurrenceCalculator';
import { logger, bookingLogger } from '@/utils/logger';

interface ProcessBookingParams {
  appointment: any;
  servicesMap: Map<string, any>;
  providersMap: Map<string, any>;
  ratedIds: Set<string>;
  userData: any;
  approvedInvoices: Set<string>;
}

// CRITICAL: Always use the exact date from DB - no transformations
// This ensures consistency across all views (client bookings, provider calendar, dashboard)
function getAppointmentDate(startTime: string): Date {
  return new Date(startTime);
}

export function processClientBooking({
  appointment,
  servicesMap,
  providersMap,
  ratedIds,
  userData,
  approvedInvoices
}: ProcessBookingParams): ClientBooking {
  const service = servicesMap.get(appointment.listing_id);
  const provider = providersMap.get(appointment.provider_id);
  
  bookingLogger.debug(`=== PROCESANDO CITA ${appointment.id} ===`);
  
  // Construir ubicación
  const location = buildAppointmentLocation(appointment, userData);
  
  // CRITICAL: Use exact date from DB without transformation
  // This ensures the same date appears in all views
  const appointmentDate = getAppointmentDate(appointment.start_time);

  // Determinar si es post-pago y si puede ser calificado
  const isPostPayment = service?.is_post_payment || false;
  const canRate = appointment.status === 'completed' && 
    (!isPostPayment || approvedInvoices.has(appointment.id));

  return {
    id: appointment.id,
    serviceName: service?.title || 'Servicio',
    subcategory: service?.service_types?.name || 'Servicio',
    categoryId: service?.service_types?.service_categories?.name || 'other',
    date: appointmentDate,
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
    originalAppointmentId: appointment.is_recurring_instance 
      ? appointment.id.split('-recurring-')[0] 
      : undefined,
    isPostPayment,
    supportsPostPayment: service?.is_post_payment || false,
    isPostPaymentApproved: approvedInvoices.has(appointment.id),
    notes: appointment.notes,
    canRate
  };
}

function buildAppointmentLocation(appointment: any, userData: any): string {
  let location = 'Ubicación no especificada';
  
  if (appointment.external_booking && appointment.client_address) {
    logger.debug('Reserva externa detectada');
    location = buildCompleteLocation({
      clientAddress: appointment.client_address,
      isExternal: true
    }, appointment.id);
  } else if (userData) {
    logger.debug('Construyendo ubicación interna con datos COMPLETOS');
    
    const locationData = {
      residenciaName: userData.residencias?.name,
      condominiumText: userData.condominium_text,
      condominiumName: userData.condominium_name,
      houseNumber: userData.house_number,
      isExternal: false
    };
    
    logger.debug('=== DATOS ENVIADOS A buildCompleteLocation ===');
    logger.debug('Datos completos:', JSON.stringify(locationData, null, 2));
    
    location = buildCompleteLocation(locationData, appointment.id);
  } else {
    logger.warn('NO HAY DATOS DE USUARIO para construcción de ubicación');
  }

  logger.debug(`Ubicación final para cita ${appointment.id}:`, location);
  return location;
}