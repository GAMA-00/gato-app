
export interface LocationData {
  residenciaName?: string;
  condominiumName?: string;
  houseNumber?: string;
  apartment?: string;
  clientAddress?: string;
  isExternal?: boolean;
}

export const buildLocationString = (data: LocationData): string => {
  // For external bookings, use the stored address
  if (data.isExternal) {
    return data.clientAddress || 'Ubicación externa';
  }

  console.log('Building location with data:', data);

  const parts: string[] = [];
  
  // Add residencia name
  if (data.residenciaName && data.residenciaName.trim()) {
    parts.push(data.residenciaName.trim());
  }
  
  // Add condominium name - be more flexible with the field name
  const condominiumName = data.condominiumName;
  if (condominiumName && condominiumName.trim()) {
    parts.push(condominiumName.trim());
  }
  
  // Add house/apartment number - prioritize apartment, then house_number
  const houseNumber = data.apartment || data.houseNumber;
  if (houseNumber && houseNumber.toString().trim()) {
    // Format house number consistently, removing any existing prefixes
    const cleanNumber = houseNumber.toString().replace(/^(casa\s*|#\s*)/i, '').trim();
    if (cleanNumber) {
      parts.push(cleanNumber);
    }
  }
  
  console.log('Location parts built:', parts);
  
  // Return in the standardized format: Residencia – Condominio – Número
  if (parts.length >= 3) {
    const result = parts.join(' – ');
    console.log('Final location (3 parts):', result);
    return result;
  } else if (parts.length >= 2) {
    const result = parts.join(' – ');
    console.log('Final location (2 parts):', result);
    return result;
  } else if (parts.length === 1) {
    console.log('Final location (1 part):', parts[0]);
    return parts[0];
  }
  
  // Fallback if no data
  console.log('No location data available, using fallback');
  return 'Ubicación no especificada';
};

export const logLocationDebug = (appointmentId: string, data: LocationData, finalLocation: string): void => {
  console.log(`=== LOCATION DEBUG for appointment ${appointmentId} ===`);
  console.log('Input data:', {
    residencia: data.residenciaName,
    condominium: data.condominiumName,
    apartment: data.apartment,
    house_number: data.houseNumber,
    isExternal: data.isExternal,
    clientAddress: data.clientAddress
  });
  console.log('Final location result:', finalLocation);
  console.log('===============================');
};
