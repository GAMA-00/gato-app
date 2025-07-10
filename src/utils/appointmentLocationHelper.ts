
import { buildCompleteLocation } from './locationBuilder';

export interface AppointmentLocationData {
  appointment: any;
  clientData?: any;
}

export const buildAppointmentLocation = ({ appointment, clientData }: AppointmentLocationData): string => {
  // Check if this is an external booking
  const isExternal = appointment.external_booking || appointment.is_external;
  
  if (isExternal) {
    return buildCompleteLocation({
      clientAddress: appointment.client_address,
      isExternal: true
    }, appointment.id);
  }
  
  // Build from client data if available
  if (clientData) {
    return buildCompleteLocation({
      residenciaName: clientData.residencias?.name,
      condominiumText: clientData.condominium_text,
      condominiumName: clientData.condominium_name,
      houseNumber: clientData.house_number,
      isExternal: false
    }, appointment.id);
  }
  
  // Fallback to appointment properties if available
  return buildCompleteLocation({
    residenciaName: appointment.residencias?.name,
    condominiumText: appointment.condominium_text,
    condominiumName: appointment.condominium_name,
    houseNumber: appointment.house_number,
    clientAddress: appointment.client_address,
    isExternal: false
  }, appointment.id);
};
