
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

// NUEVO: Función simplificada que SIEMPRE usa la ubicación pre-construida
export const getLocationInfo = (appointment: any) => {
  console.log('=== GET LOCATION INFO (SIMPLIFIED) ===');
  console.log('Getting location for appointment:', appointment.id);
  
  // PRIORITY 1: Use pre-computed complete location from useAppointments
  if (appointment.complete_location) {
    console.log('✅ Using pre-computed complete_location:', appointment.complete_location);
    return appointment.complete_location;
  }
  
  // PRIORITY 2: Use pre-built client_location from pending requests
  if (appointment.client_location) {
    console.log('✅ Using pre-built client_location:', appointment.client_location);
    return appointment.client_location;
  }
  
  // FALLBACK: Build location on-demand (for compatibility with other sources)
  console.log('⚠️ FALLBACK: Building location on-demand');
  
  const isExternal = appointment.external_booking || appointment.is_external;
  
  if (isExternal) {
    console.log('Building external location');
    return buildCompleteLocation({
      clientAddress: appointment.client_address,
      isExternal: true
    }, appointment.id);
  }
  
  // Build from available client data
  if (appointment.client_data) {
    console.log('Building from client_data');
    return buildCompleteLocation({
      residenciaName: appointment.client_data.residencias?.name,
      condominiumText: appointment.client_data.condominium_text,
      condominiumName: appointment.client_data.condominium_name,
      houseNumber: appointment.client_data.house_number,
      isExternal: false
    }, appointment.id);
  }
  
  // Final fallback using direct appointment properties
  console.log('Final fallback using appointment properties');
  return buildCompleteLocation({
    residenciaName: appointment.residencias?.name || appointment.users?.residencias?.name,
    condominiumText: appointment.users?.condominium_text || appointment.condominium_text,
    condominiumName: appointment.users?.condominium_name || appointment.condominium_name,
    houseNumber: appointment.users?.house_number || appointment.house_number,
    clientAddress: appointment.client_address,
    isExternal: false
  }, appointment.id);
};

// Enhanced contact info function
export const getContactInfo = (appointment: any) => {
  // For external bookings, prioritize stored contact info
  if (appointment.is_external || appointment.external_booking) {
    return appointment.client_phone || appointment.client_email || 'Sin contacto';
  }
  
  // Try to get contact from client_data
  if (appointment.client_data) {
    return appointment.client_data.phone || appointment.client_data.email || null;
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
