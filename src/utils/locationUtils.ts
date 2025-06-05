
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

  const parts: string[] = [];
  
  // Add residencia name
  if (data.residenciaName) {
    parts.push(data.residenciaName);
  }
  
  // Add condominium name
  if (data.condominiumName) {
    parts.push(data.condominiumName);
  }
  
  // Add house/apartment number - prioritize apartment, then house_number
  const houseNumber = data.apartment || data.houseNumber;
  if (houseNumber) {
    // Ensure consistent format with "Casa" prefix if it's just a number
    if (/^\d+$/.test(houseNumber)) {
      parts.push(`Casa ${houseNumber}`);
    } else if (!houseNumber.toLowerCase().includes('casa') && !houseNumber.startsWith('#')) {
      parts.push(`Casa ${houseNumber}`);
    } else if (houseNumber.startsWith('#')) {
      parts.push(houseNumber.replace('#', 'Casa '));
    } else {
      parts.push(houseNumber);
    }
  }
  
  return parts.length > 0 ? parts.join(' – ') : 'Ubicación no especificada';
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
