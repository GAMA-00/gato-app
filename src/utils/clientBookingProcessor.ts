import { ClientBooking } from '@/hooks/useClientBookings';
import { buildCompleteLocation } from '@/utils/locationBuilder';
import { calculateNextOccurrence } from '@/utils/nextOccurrenceCalculator';

interface ProcessBookingParams {
  appointment: any;
  servicesMap: Map<string, any>;
  providersMap: Map<string, any>;
  ratedIds: Set<string>;
  userData: any;
  approvedInvoices: Set<string>;
}

// Enhanced function to calculate next occurrence ONLY for active recurring appointments
function calculateNextOccurrenceForRecurring(
  startTime: string,
  recurrence: string,
  status: string
): Date {
  const originalDate = new Date(startTime);
  const now = new Date();
  
  // For non-recurring appointments, always use original date
  if (!recurrence || recurrence === 'none') {
    return originalDate;
  }
  
  // CRITICAL: Don't calculate next occurrence for completed appointments
  // This prevents "ghost" appointments from showing up
  if (status === 'completed') {
    console.log(`✅ Completed appointment - using original date: ${originalDate.toISOString()}`);
    return originalDate;
  }
  
  // For active recurring appointments, calculate next future occurrence if original date has passed
  const validRecurrences = ['weekly', 'biweekly', 'triweekly', 'monthly'];
  const activeStatuses = ['pending', 'confirmed'];
  
  if (validRecurrences.includes(recurrence) && activeStatuses.includes(status)) {
    // If original date is in the future, use it
    if (originalDate > now) {
      console.log(`📅 Future appointment - using original date: ${originalDate.toISOString()}`);
      return originalDate;
    }
    
    // If original date has passed, calculate next occurrence
    let nextDate = new Date(originalDate);
    
    switch (recurrence) {
      case 'weekly':
        while (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 7);
        }
        break;
      case 'biweekly':
        while (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 14);
        }
        break;
      case 'triweekly':
        while (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 21);
        }
        break;
      case 'monthly':
        while (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        break;
    }
    
    console.log(`🔄 Next occurrence calculated for ${status} ${recurrence} appointment: original=${originalDate.toISOString()}, next=${nextDate.toISOString()}`);
    return nextDate;
  }
  
  // For all other cases (cancelled, rejected, etc.), use original date
  return originalDate;
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
  
  console.log(`🔄 === PROCESANDO CITA ${appointment.id} ===`);
  
  // Construir ubicación
  const location = buildAppointmentLocation(appointment, userData);
  
  // Calcular próxima fecha de ocurrencia real con lógica mejorada para recurrencias
  const nextOccurrenceDate = calculateNextOccurrenceForRecurring(
    appointment.start_time,
    appointment.recurrence,
    appointment.status
  );

  // Determinar si es post-pago y si puede ser calificado
  const isPostPayment = service?.is_post_payment || false;
  const canRate = appointment.status === 'completed' && 
    (!isPostPayment || approvedInvoices.has(appointment.id));

  return {
    id: appointment.id,
    serviceName: service?.title || 'Servicio',
    subcategory: service?.service_types?.name || 'Servicio',
    categoryId: service?.service_types?.service_categories?.name || 'other',
    date: nextOccurrenceDate,
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
    canRate
  };
}

function buildAppointmentLocation(appointment: any, userData: any): string {
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
  return location;
}