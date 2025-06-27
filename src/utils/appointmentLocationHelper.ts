
import { buildCompleteLocation } from './locationBuilder';

export interface AppointmentLocationData {
  appointment: any;
  clientData?: any;
}

export const buildAppointmentLocation = ({ appointment, clientData }: AppointmentLocationData): string => {
  console.log(`🔧 === HELPER: BUILDING LOCATION FOR APPOINTMENT ${appointment.id} ===`);
  
  // Check if this is an external booking
  const isExternal = appointment.external_booking || appointment.is_external;
  
  if (isExternal) {
    console.log('🌍 External booking detected');
    return buildCompleteLocation({
      clientAddress: appointment.client_address,
      isExternal: true
    }, appointment.id);
  }
  
  // Build from client data if available
  if (clientData) {
    console.log('🏠 Building from complete client data');
    console.log('Client data:', {
      residencia: clientData.residencias?.name,
      condominium_text: clientData.condominium_text,
      condominium_name: clientData.condominium_name,
      house_number: clientData.house_number
    });
    
    return buildCompleteLocation({
      residenciaName: clientData.residencias?.name,
      condominiumText: clientData.condominium_text,
      condominiumName: clientData.condominium_name,
      houseNumber: clientData.house_number,
      isExternal: false
    }, appointment.id);
  }
  
  // Fallback to appointment properties if available
  console.log('⚠️ Fallback to appointment properties');
  return buildCompleteLocation({
    residenciaName: appointment.residencias?.name,
    condominiumText: appointment.condominium_text,
    condominiumName: appointment.condominium_name,
    houseNumber: appointment.house_number,
    clientAddress: appointment.client_address,
    isExternal: false
  }, appointment.id);
};
