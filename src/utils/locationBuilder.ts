
export interface CompleteLocationData {
  residenciaName?: string;
  condominiumName?: string;
  condominiumText?: string;
  houseNumber?: string;
  clientAddress?: string;
  isExternal?: boolean;
}

export const buildCompleteLocation = (data: CompleteLocationData, appointmentId?: string): string => {
  const debugId = appointmentId || 'unknown';
  console.log(`🔍 === BUILDING LOCATION FOR DASHBOARD ${debugId} ===`);
  console.log('📥 Raw input data:', JSON.stringify(data, null, 2));

  // Para reservas externas, usar la dirección del cliente
  if (data.isExternal && data.clientAddress) {
    console.log('🌍 External booking detected, using client address:', data.clientAddress);
    return data.clientAddress;
  }

  // Construir ubicación progresivamente basado en datos disponibles
  let finalLocation = '';
  
  // PASO 1: Verificar si tenemos residencia
  if (data.residenciaName?.trim()) {
    console.log('✅ PASO 1 - Residencia encontrada:', data.residenciaName.trim());
    finalLocation = `Residencia ${data.residenciaName.trim()}`;
    
    // PASO 2: Agregar condominio si está disponible
    let condominiumToAdd = '';
    if (data.condominiumText?.trim()) {
      condominiumToAdd = data.condominiumText.trim();
      console.log('✅ PASO 2A - Usando condominiumText:', condominiumToAdd);
    } else if (data.condominiumName?.trim()) {
      condominiumToAdd = data.condominiumName.trim();
      console.log('✅ PASO 2B - Usando condominiumName:', condominiumToAdd);
    }
    
    if (condominiumToAdd) {
      finalLocation += ` – ${condominiumToAdd}`;
      console.log('✅ PASO 2 - Condominio agregado:', condominiumToAdd);
      
      // PASO 3: Agregar número de casa si está disponible
      if (data.houseNumber?.toString().trim()) {
        const cleanNumber = data.houseNumber.toString().replace(/^(casa\s*|#\s*)/i, '').trim();
        if (cleanNumber) {
          finalLocation += ` – Casa ${cleanNumber}`;
          console.log('✅ PASO 3 - Número de casa agregado:', cleanNumber);
        }
      } else {
        console.log('⚠️ PASO 3 - No hay número de casa, pero tenemos residencia + condominio');
      }
    } else {
      console.log('⚠️ PASO 2 - No hay condominio, pero tenemos residencia');
    }
  } else {
    console.log('❌ PASO 1 - No hay residencia disponible');
    // Si no hay residencia, usar un mensaje más descriptivo
    if (data.isExternal) {
      finalLocation = 'Reserva Externa';
    } else {
      finalLocation = 'Residencia por confirmar';
    }
  }
  
  console.log('🎯 UBICACIÓN FINAL PARA DASHBOARD', debugId + ':', finalLocation);
  console.log('🔍 === FIN CONSTRUCCIÓN UBICACIÓN DASHBOARD ===\n');
  
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
