
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
  
  // Add residencia name (required for consistent format)
  if (data.residenciaName) {
    parts.push(data.residenciaName);
  }
  
  // Add condominium name (required for consistent format)
  if (data.condominiumName) {
    parts.push(data.condominiumName);
  }
  
  // Add house/apartment number - prioritize apartment, then house_number
  const houseNumber = data.apartment || data.houseNumber;
  if (houseNumber) {
    // Format house number consistently without "Casa" prefix, just the number
    const cleanNumber = houseNumber.toString().replace(/^(casa\s*|#\s*)/i, '');
    parts.push(cleanNumber);
  }
  
  // Return in the standardized format: Residencia – Condominio – Número
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
