
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

  console.log('=== BUILDING LOCATION STRING ===');
  console.log('Input data:', data);

  const parts: string[] = [];
  
  // Add residencia name
  if (data.residenciaName && data.residenciaName.trim()) {
    parts.push(data.residenciaName.trim());
    console.log('Added residencia:', data.residenciaName.trim());
  }
  
  // Add condominium name
  if (data.condominiumName && data.condominiumName.trim()) {
    parts.push(data.condominiumName.trim());
    console.log('Added condominium:', data.condominiumName.trim());
  }
  
  // Add house/apartment number - prioritize apartment, then house number
  const houseNumber = data.apartment || data.houseNumber;
  if (houseNumber && houseNumber.toString().trim()) {
    // Format house number consistently, removing any existing prefixes
    const cleanNumber = houseNumber.toString().replace(/^(casa\s*|#\s*)/i, '').trim();
    if (cleanNumber) {
      parts.push(cleanNumber);
      console.log('Added house number:', cleanNumber);
    }
  }
  
  console.log('Final parts array:', parts);
  
  // Return in the standardized format: Residencia – Condominio – Número
  const result = parts.length > 0 ? parts.join(' – ') : 'Ubicación no especificada';
  console.log('Final location result:', result);
  
  return result;
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
