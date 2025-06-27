
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

  // Inicializar array de partes de la ubicación
  const locationParts: string[] = [];
  
  // PASO 1: Agregar residencia si existe
  if (data.residenciaName?.trim()) {
    locationParts.push(data.residenciaName.trim());
    console.log('✅ PASO 1 - Agregada residencia:', data.residenciaName.trim());
  } else {
    console.log('❌ PASO 1 - No hay nombre de residencia');
  }
  
  // PASO 2: Agregar condominio (priorizar condominiumText sobre condominiumName)
  let condominiumToAdd = '';
  if (data.condominiumText?.trim()) {
    condominiumToAdd = data.condominiumText.trim();
    console.log('✅ PASO 2A - Usando condominiumText:', condominiumToAdd);
  } else if (data.condominiumName?.trim()) {
    condominiumToAdd = data.condominiumName.trim();
    console.log('✅ PASO 2B - Usando condominiumName:', condominiumToAdd);
  } else {
    console.log('⚠️ PASO 2 - No hay datos de condominio');
  }
  
  if (condominiumToAdd) {
    locationParts.push(condominiumToAdd);
    console.log('✅ PASO 2 - Condominio agregado a partes:', condominiumToAdd);
  }
  
  // PASO 3: Agregar número de casa
  if (data.houseNumber?.toString().trim()) {
    const cleanNumber = data.houseNumber.toString().replace(/^(casa\s*|#\s*)/i, '').trim();
    if (cleanNumber) {
      locationParts.push(cleanNumber);
      console.log('✅ PASO 3 - Número de casa agregado:', cleanNumber);
    }
  } else {
    console.log('⚠️ PASO 3 - No hay número de casa');
  }
  
  // CONSTRUCCIÓN FINAL
  console.log('🔧 === CONSTRUCCIÓN FINAL PARA DASHBOARD ===');
  console.log('📋 Partes recolectadas:', locationParts);
  console.log('📊 Total de partes:', locationParts.length);
  
  // Construir resultado final
  let finalLocation = '';
  if (locationParts.length === 0) {
    finalLocation = 'Ubicación no especificada';
    console.log('❌ Sin partes - resultado por defecto:', finalLocation);
  } else if (locationParts.length === 1) {
    finalLocation = locationParts[0];
    console.log('📍 Una sola parte - resultado:', finalLocation);
  } else {
    finalLocation = locationParts.join(' – ');
    console.log('🔗 Múltiples partes unidas - resultado:', finalLocation);
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
