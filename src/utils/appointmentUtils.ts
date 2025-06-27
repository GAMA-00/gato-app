
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
  return appointment.listings?.title || 'Servicio';
};

// Enhanced location info function with complete client data
export const getLocationInfo = (appointment: any) => {
  console.log('=== GET LOCATION INFO WITH COMPLETE DATA ===');
  console.log('Getting location for appointment:', appointment.id);
  console.log('Appointment data:', {
    id: appointment.id,
    external_booking: appointment.external_booking,
    client_address: appointment.client_address,
    has_client_data: !!appointment.client_data
  });
  
  // First, check if we have pre-computed complete location
  if (appointment.complete_location) {
    console.log('Using pre-computed location:', appointment.complete_location);
    return appointment.complete_location;
  }
  
  // Check if this is from pending requests or similar where client_location is already built
  if (appointment.client_location) {
    console.log('Using pre-built client_location:', appointment.client_location);
    return appointment.client_location;
  }
  
  // Check if this is an external booking
  const isExternal = appointment.external_booking || appointment.is_external;
  
  if (isExternal) {
    console.log('External booking detected, using client address:', appointment.client_address);
    return buildCompleteLocation({
      clientAddress: appointment.client_address,
      isExternal: true
    }, appointment.id);
  }
  
  // Build complete location from client_data (NEW LOGIC)
  if (appointment.client_data) {
    console.log('=== BUILDING LOCATION FROM COMPLETE CLIENT DATA ===');
    console.log('Client data available:', {
      name: appointment.client_data.name,
      house_number: appointment.client_data.house_number,
      condominium_text: appointment.client_data.condominium_text,
      condominium_name: appointment.client_data.condominium_name,
      residencia_name: appointment.client_data.residencias?.name
    });
    
    const locationData = {
      residenciaName: appointment.client_data.residencias?.name,
      condominiumText: appointment.client_data.condominium_text,
      condominiumName: appointment.client_data.condominium_name,
      houseNumber: appointment.client_data.house_number,
      isExternal: false
    };
    
    console.log('Location data to build:', locationData);
    const location = buildCompleteLocation(locationData, appointment.id);
    console.log('Built location result:', location);
    return location;
  }
  
  // Fallback: build location manually from available data (OLD LOGIC - for compatibility)
  console.log('=== FALLBACK TO OLD LOGIC ===');
  const condominiumName = appointment.users?.condominium_name || 
                          appointment.users?.condominium_text || 
                          appointment.condominium_name ||
                          appointment.condominium_text;
  
  const location = buildCompleteLocation({
    residenciaName: appointment.residencias?.name || appointment.users?.residencias?.name,
    condominiumName: condominiumName,
    condominiumText: appointment.users?.condominium_text || appointment.condominium_text,
    houseNumber: appointment.users?.house_number || appointment.house_number,
    clientAddress: appointment.client_address,
    isExternal: false
  }, appointment.id);
  
  console.log('Fallback location result:', location);
  return location;
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
