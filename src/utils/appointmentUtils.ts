
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

// MEJORADA: Función que GARANTIZA una ubicación válida siempre
export const getLocationInfo = (appointment: any) => {
  console.log(`🔍 === GET LOCATION INFO ENHANCED FOR ${appointment.id} ===`);
  console.log('Appointment location data:', {
    id: appointment.id,
    complete_location: appointment.complete_location,
    client_location: appointment.client_location,
    external_booking: appointment.external_booking,
    client_address: appointment.client_address,
    has_client_data: !!appointment.client_data
  });
  
  // PRIORITY 1: Use pre-computed complete location (from useAppointments)
  if (appointment.complete_location && appointment.complete_location !== 'Residencia por confirmar') {
    console.log('✅ Using validated complete_location:', appointment.complete_location);
    return appointment.complete_location;
  }
  
  // PRIORITY 2: Use pre-built client_location from pending requests
  if (appointment.client_location && appointment.client_location !== 'Residencia por confirmar') {
    console.log('✅ Using validated client_location:', appointment.client_location);
    return appointment.client_location;
  }
  
  // PRIORITY 3: Force build location on-demand with all available data
  console.log('⚠️ FORCE BUILDING LOCATION - No valid pre-computed location found');
  
  const isExternal = appointment.external_booking || appointment.is_external;
  
  if (isExternal) {
    console.log('🌍 Building external location');
    const externalLocation = buildCompleteLocation({
      clientAddress: appointment.client_address,
      isExternal: true
    }, appointment.id);
    
    console.log('✅ Built external location:', externalLocation);
    return externalLocation;
  }
  
  // Build from available client data with COMPLETE information
  if (appointment.client_data) {
    console.log('🏠 Building from complete client_data');
    const builtLocation = buildCompleteLocation({
      residenciaName: appointment.client_data.residencias?.name,
      condominiumText: appointment.client_data.condominium_text,
      condominiumName: appointment.client_data.condominium_name,
      houseNumber: appointment.client_data.house_number,
      isExternal: false
    }, appointment.id);
    
    console.log('✅ Built location from client_data:', builtLocation);
    return builtLocation;
  }
  
  // Final fallback: Build from appointment properties (for recurring instances)
  console.log('🔧 Final fallback using appointment properties');
  
  // For recurring instances, try to extract from the original appointment data
  let clientResidenciaName, clientCondominiumText, clientCondominiumName, clientHouseNumber;
  
  // Check if this is a recurring instance and we have the data in the appointment itself
  if (appointment.is_recurring_instance) {
    clientResidenciaName = appointment.residencias?.name;
    clientCondominiumText = appointment.condominium_text;
    clientCondominiumName = appointment.condominium_name;
    clientHouseNumber = appointment.house_number;
  } else {
    // Try to get client data from appointment users relationship
    clientResidenciaName = appointment.residencias?.name || 
                           appointment.users?.residencias?.name;
                               
    clientCondominiumText = appointment.users?.condominium_text || 
                           appointment.condominium_text;
                               
    clientCondominiumName = appointment.users?.condominium_name || 
                           appointment.condominium_name;
                               
    clientHouseNumber = appointment.users?.house_number || 
                       appointment.house_number;
  }
  
  console.log('Building from appointment fallback data:', {
    residenciaName: clientResidenciaName,
    condominiumText: clientCondominiumText, 
    condominiumName: clientCondominiumName,
    houseNumber: clientHouseNumber,
    is_recurring_instance: appointment.is_recurring_instance
  });
  
  const fallbackLocation = buildCompleteLocation({
    residenciaName: clientResidenciaName,
    condominiumText: clientCondominiumText,
    condominiumName: clientCondominiumName,
    houseNumber: clientHouseNumber,
    clientAddress: appointment.client_address,
    isExternal: false
  }, appointment.id);
  
  console.log('✅ Final fallback location built:', fallbackLocation);
  console.log(`🔍 === END GET LOCATION INFO FOR ${appointment.id} ===`);
  
  return fallbackLocation;
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
