
export interface CompleteLocationData {
  residenciaName?: string;
  condominiumName?: string;
  condominiumText?: string;
  houseNumber?: string;
  clientAddress?: string;
  isExternal?: boolean;
}

// Memoization cache for location building
const locationCache = new Map<string, string>();

export const buildCompleteLocation = (data: CompleteLocationData, appointmentId?: string): string => {
  // Create cache key from data
  const cacheKey = JSON.stringify(data);
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey)!;
  }

  // Para reservas externas, usar la dirección del cliente
  if (data.isExternal && data.clientAddress) {
    const result = data.clientAddress;
    locationCache.set(cacheKey, result);
    return result;
  }

  // Construir ubicación progresivamente basado en datos disponibles
  let finalLocation = '';
  
  // Construcción flexible: armar por partes aunque falte la residencia
  const parts: string[] = [];

  // Residencia (si existe)
  if (data.residenciaName?.trim()) {
    parts.push(data.residenciaName.trim());
  }

  // Condominio: preferir texto libre y luego nombre
  let condominiumToAdd = '';
  if (data.condominiumText?.trim()) {
    condominiumToAdd = data.condominiumText.trim();
  } else if (data.condominiumName?.trim()) {
    condominiumToAdd = data.condominiumName.trim();
  }
  if (condominiumToAdd) {
    parts.push(condominiumToAdd);
  }

  // Número de casa (normalizado y con prefijo "Casa")
  if (data.houseNumber?.toString().trim()) {
    const cleanNumber = data.houseNumber.toString().replace(/^(casa\s*|#\s*)/i, '').trim();
    if (cleanNumber) {
      parts.push(`Casa ${cleanNumber}`);
    }
  }

  if (parts.length > 0) {
    finalLocation = parts.join(' - ');
  } else {
    // Si no hay residencia/condominio/casa: manejar según tipo
    if (data.isExternal && data.clientAddress?.trim()) {
      finalLocation = data.clientAddress.trim();
    } else if (data.isExternal) {
      finalLocation = 'Reserva Externa';
    } else {
      finalLocation = 'Residencia por confirmar';
    }
  }
  
  // Cache the result and return
  locationCache.set(cacheKey, finalLocation);
  return finalLocation;
};

export const logLocationDebug = (appointmentId: string, data: CompleteLocationData, finalLocation: string): void => {
  console.log(`🐛 === DEBUG UBICACIÓN DASHBOARD ${appointmentId} ===`);
  console.log('📝 Datos de entrada:', {
    residencia: data.residenciaName,
    condominiumText: data.condominiumText,
    condominiumName: data.condominiumName,
    houseNumber: data.houseNumber,
    isExternal: data.isExternal,
    clientAddress: data.clientAddress
  });
  console.log('🎯 Resultado final:', finalLocation);
  console.log('🐛 === FIN DEBUG DASHBOARD ===\n');
};
