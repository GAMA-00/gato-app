
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
    console.log('⚠️ NO CONDOMINIUM DATA FOUND - this is okay, will continue with house number');
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
  
  // CRITICAL FIX: Never return just residencia if we should have more data
  // If we only have residencia but the user should have condominium/house data, 
  // we need to investigate why that data is missing
  if (parts.length === 1 && data.residenciaName) {
    console.log('🚨 WARNING: Only residencia found, but checking if we should have more data...');
    
    // Check if we have any indication that there should be more data
    const hasCondominiumIndication = data.condominiumText !== undefined || data.condominiumName !== undefined;
    const hasHouseIndication = data.houseNumber !== undefined || data.apartment !== undefined;
    
    if (hasCondominiumIndication || hasHouseIndication) {
      console.log('🚨 CRITICAL: We should have more location data but it seems to be null/empty');
      console.log('Available data indicators:', {
        hasCondominiumIndication,
        hasHouseIndication,
        condominiumText: data.condominiumText,
        condominiumName: data.condominiumName,
        houseNumber: data.houseNumber,
        apartment: data.apartment
      });
    }
  }
  
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
