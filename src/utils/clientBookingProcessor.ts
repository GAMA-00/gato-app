import { ClientBooking } from '@/hooks/useClientBookings';
import { buildCompleteLocation } from '@/utils/locationBuilder';
import { calculateNextOccurrence } from '@/utils/nextOccurrenceCalculator';

interface ProcessBookingParams {
  appointment: any;
  servicesMap: Map<string, any>;
  providersMap: Map<string, any>;
  ratedIds: Set<string>;
  userData: any;
}

export function processClientBooking({
  appointment,
  servicesMap,
  providersMap,
  ratedIds,
  userData
}: ProcessBookingParams): ClientBooking {
  const service = servicesMap.get(appointment.listing_id);
  const provider = providersMap.get(appointment.provider_id);
  
  console.log(`🔄 === PROCESANDO CITA ${appointment.id} ===`);
  
  // Construir ubicación
  const location = buildAppointmentLocation(appointment, userData);
  
  // Calcular próxima fecha de ocurrencia real
  const nextOccurrenceDate = calculateNextOccurrence(
    appointment.start_time,
    appointment.recurrence
  );

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
      : undefined
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