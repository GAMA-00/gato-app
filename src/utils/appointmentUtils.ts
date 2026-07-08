
import { buildCompleteLocation } from './locationBuilder';

// Enhanced function to get the correct name based on user role
export const getDisplayName = (appointment: any, user: any) => {
  // If the user is a provider, show client name
  if (user?.role === 'provider') {
    if (appointment.client_name) {
      return appointment.client_name;
    }
    
    // Try to get name from client_data
    if (appointment.client_data?.name) {
      return appointment.client_data.name;
    }
    
    // Fallback for external bookings
    if (appointment.is_external || appointment.external_booking) {
      return 'Cliente Externo';
    }
    
    return 'Cliente sin nombre';
  } 
  // If the user is a client, show provider name
  else {
    if (appointment.provider_name) {
      return appointment.provider_name;
    }
    
    return 'Proveedor desconocido';
  }
};

// Helper function to get service name with fallback
export const getServiceName = (appointment: any) => {
  return appointment.listings?.title || appointment.service_title || 'Servicio';
};

export const getLocationInfo = (appointment: any) => {
  if (appointment.complete_location && appointment.complete_location !== 'Residencia por confirmar') {
    return appointment.complete_location;
  }
  if (appointment.client_location && appointment.client_location !== 'Residencia por confirmar') {
    return appointment.client_location;
  }

  const isExternal = appointment.external_booking || appointment.is_external;
  if (isExternal) {
    return buildCompleteLocation({ clientAddress: appointment.client_address, isExternal: true }, appointment.id);
  }

  if (appointment.client_data) {
    return buildCompleteLocation({
      residenciaName: appointment.client_data.residencias?.name,
      condominiumText: appointment.client_data.condominium_text,
      condominiumName: appointment.client_data.condominium_name,
      houseNumber: appointment.client_data.house_number,
      isExternal: false,
    }, appointment.id);
  }

  let clientResidenciaName, clientCondominiumText, clientCondominiumName, clientHouseNumber;
  if (appointment.is_recurring_instance) {
    clientResidenciaName = appointment.residencias?.name;
    clientCondominiumText = appointment.condominium_text;
    clientCondominiumName = appointment.condominium_name;
    clientHouseNumber = appointment.house_number;
  } else {
    clientResidenciaName = appointment.residencias?.name || appointment.users?.residencias?.name;
    clientCondominiumText = appointment.users?.condominium_text || appointment.condominium_text;
    clientCondominiumName = appointment.users?.condominium_name || appointment.condominium_name;
    clientHouseNumber = appointment.users?.house_number || appointment.house_number;
  }

  return buildCompleteLocation({
    residenciaName: clientResidenciaName,
    condominiumText: clientCondominiumText,
    condominiumName: clientCondominiumName,
    houseNumber: clientHouseNumber,
    clientAddress: appointment.client_address,
    isExternal: false,
  }, appointment.id);
};

// Returns phone for all appointments (both link and app bookings)
export const getContactInfo = (appointment: any) => {
  const phone = appointment.client_phone || appointment.client_data?.phone;
  if (phone) return phone;
  const email = appointment.client_email || appointment.client_data?.email;
  if (email) return email;
  return 'Sin contacto';
};

// Helper function to get initials for avatar
export const getInitials = (name: string) => {
  if (!name || name === 'Cliente sin nombre' || name === 'Proveedor desconocido' || name === 'Cliente Externo') {
    return 'U';
  }
  
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
};
