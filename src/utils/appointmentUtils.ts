
import { LocationData, buildLocationString } from './locationUtils';

// Enhanced function to get the correct name based on user role
export const getDisplayName = (appointment: any, user: any) => {
  // If the user is a provider, show client name
  if (user?.role === 'provider') {
    if (appointment.client_name) {
      return appointment.client_name;
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
  return appointment.listings?.title || 'Servicio';
};

// Enhanced location info function with better fallback logic
export const getLocationInfo = (appointment: any) => {
  console.log('Getting location for appointment:', appointment.id, appointment);
  
  // First, check if we have pre-computed complete location
  if (appointment.complete_location) {
    console.log('Using pre-computed location:', appointment.complete_location);
    return appointment.complete_location;
  }
  
  // Fallback: build location manually from available data
  const isExternal = appointment.external_booking || appointment.is_external;
  
  if (isExternal) {
    const location = appointment.client_address || 'Ubicación externa';
    console.log('External appointment location:', location);
    return location;
  }
  
  // Build location from available data
  const locationData: LocationData = {
    residenciaName: appointment.residencias?.name,
    condominiumName: appointment.users?.condominium_name || appointment.users?.condominium_text,
    houseNumber: appointment.users?.house_number,
    apartment: appointment.apartment,
    clientAddress: appointment.client_address,
    isExternal: false
  };
  
  return buildLocationString(locationData);
};

// Enhanced contact info function
export const getContactInfo = (appointment: any) => {
  // For external bookings, prioritize stored contact info
  if (appointment.is_external || appointment.external_booking) {
    return appointment.client_phone || appointment.client_email || 'Sin contacto';
  }
  
  // For internal bookings, we don't have direct access to user phone/email in this context
  return null;
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
