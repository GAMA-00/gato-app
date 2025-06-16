
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
  
  // Add condominium name
  if (data.condominiumName && data.condominiumName.trim()) {
    parts.push(data.condominiumName.trim());
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
  
  console.log('Location parts:', parts);
  
  // Return in the standardized format: Residencia – Condominio – Número
  if (parts.length >= 3) {
    return parts.join(' – ');
  } else if (parts.length >= 2) {
    return parts.join(' – ');
  } else if (parts.length === 1) {
    return parts[0];
  }
  
  // Fallback if no data
  return 'Ubicación no especificada';
};

export const logLocationDebug = (appointmentId: string, data: LocationData, finalLocation: string): void => {
  console.log(`Building location for appointment ${appointmentId}:`, {
    residencia: data.residenciaName,
    condominium: data.condominiumName,
    apartment: data.apartment,
    house_number: data.houseNumber,
    isExternal: data.isExternal,
    final_location: finalLocation
  });
};
