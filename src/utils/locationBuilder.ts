
import { buildLocationString, logLocationDebug } from './locationUtils';

export interface CompleteLocationData {
  residenciaName?: string;
  condominiumName?: string;
  condominiumText?: string;
  houseNumber?: string;
  apartment?: string;
  clientAddress?: string;
  isExternal?: boolean;
}

export const buildCompleteLocation = (data: CompleteLocationData, appointmentId?: string): string => {
  console.log(`=== BUILD COMPLETE LOCATION ${appointmentId || 'unknown'} ===`);
  console.log('Raw input data:', JSON.stringify(data, null, 2));

  // For external bookings, use the stored address
  if (data.isExternal && data.clientAddress) {
    console.log('Using external address:', data.clientAddress);
    return data.clientAddress;
  }

  const parts: string[] = [];
  
  // Add residencia name if available
  if (data.residenciaName?.trim()) {
    parts.push(data.residenciaName.trim());
    console.log('✓ Added residencia:', data.residenciaName.trim());
  }
  
  // Add condominium name - CRITICAL: prioritize condominiumText over condominiumName
  // condominiumText is the field that actually contains the user's input
  let condominiumToUse = null;
  
  if (data.condominiumText?.trim()) {
    condominiumToUse = data.condominiumText.trim();
    console.log('✓ Using condominiumText:', condominiumToUse);
  } else if (data.condominiumName?.trim()) {
    condominiumToUse = data.condominiumName.trim();
    console.log('✓ Using condominiumName as fallback:', condominiumToUse);
  }
  
  if (condominiumToUse) {
    parts.push(condominiumToUse);
    console.log('✓ Added condominium to parts:', condominiumToUse);
  } else {
    console.log('⚠️ NO CONDOMINIUM DATA FOUND');
    console.log('condominiumText:', data.condominiumText);
    console.log('condominiumName:', data.condominiumName);
  }
  
  // Add house/apartment number - prioritize apartment, then house number
  let numberToUse = null;
  
  if (data.apartment?.toString().trim()) {
    numberToUse = data.apartment.toString().trim();
    console.log('✓ Using apartment number:', numberToUse);
  } else if (data.houseNumber?.toString().trim()) {
    numberToUse = data.houseNumber.toString().trim();
    console.log('✓ Using house number:', numberToUse);
  }
  
  if (numberToUse) {
    // Clean any existing prefixes like "casa" or "#"
    const cleanNumber = numberToUse.replace(/^(casa\s*|#\s*)/i, '').trim();
    if (cleanNumber) {
      parts.push(cleanNumber);
      console.log('✓ Added number to parts:', cleanNumber);
    }
  } else {
    console.log('⚠️ NO HOUSE/APARTMENT NUMBER FOUND');
    console.log('apartment:', data.apartment);
    console.log('houseNumber:', data.houseNumber);
  }
  
  console.log('Final parts array:', parts);
  
  // Build the final location string
  const result = parts.length > 0 ? parts.join(' – ') : 'Ubicación no especificada';
  console.log('🎯 FINAL LOCATION RESULT:', result);
  
  // Debug logging for troubleshooting
  if (appointmentId) {
    logLocationDebug(appointmentId, {
      residenciaName: data.residenciaName,
      condominiumName: condominiumToUse,
      houseNumber: numberToUse,
      apartment: data.apartment,
      clientAddress: data.clientAddress,
      isExternal: data.isExternal || false
    }, result);
  }
  
  return result;
};
