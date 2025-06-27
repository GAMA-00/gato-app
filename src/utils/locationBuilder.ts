
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
    console.log('✓ External booking - using client address:', data.clientAddress);
    return data.clientAddress;
  }

  // Start with empty array and build step by step
  const locationParts: string[] = [];
  
  // STEP 1: Add residencia name if available
  if (data.residenciaName?.trim()) {
    locationParts.push(data.residenciaName.trim());
    console.log('✓ STEP 1 - Added residencia:', data.residenciaName.trim());
  } else {
    console.log('⚠️ STEP 1 - No residencia name found');
  }
  
  // STEP 2: Add condominium - CRITICAL: prioritize condominiumText over condominiumName
  let condominiumToAdd = null;
  
  if (data.condominiumText?.trim()) {
    condominiumToAdd = data.condominiumText.trim();
    console.log('✓ STEP 2 - Using condominiumText:', condominiumToAdd);
  } else if (data.condominiumName?.trim()) {
    condominiumToAdd = data.condominiumName.trim();
    console.log('✓ STEP 2 - Using condominiumName as fallback:', condominiumToAdd);
  } else {
    console.log('⚠️ STEP 2 - No condominium data found (this is OK for some users)');
  }
  
  if (condominiumToAdd) {
    locationParts.push(condominiumToAdd);
    console.log('✓ STEP 2 - Added condominium to parts:', condominiumToAdd);
  }
  
  // STEP 3: Add house/apartment number - prioritize apartment, then house number
  let numberToAdd = null;
  
  if (data.apartment?.toString().trim()) {
    numberToAdd = data.apartment.toString().trim();
    console.log('✓ STEP 3 - Using apartment number:', numberToAdd);
  } else if (data.houseNumber?.toString().trim()) {
    numberToAdd = data.houseNumber.toString().trim();
    console.log('✓ STEP 3 - Using house number:', numberToAdd);
  } else {
    console.log('⚠️ STEP 3 - No house/apartment number found');
  }
  
  if (numberToAdd) {
    // Clean any existing prefixes like "Casa" or "#"
    const cleanNumber = numberToAdd.replace(/^(casa\s*|#\s*)/i, '').trim();
    if (cleanNumber) {
      locationParts.push(cleanNumber);
      console.log('✓ STEP 3 - Added number to parts:', cleanNumber);
    }
  }
  
  // STEP 4: Build final result with validation
  console.log('=== FINAL CONSTRUCTION ===');
  console.log('All location parts collected:', locationParts);
  console.log('Total parts:', locationParts.length);
  
  // CRITICAL VALIDATION: Never return just residencia if we should have more data
  if (locationParts.length === 1 && data.residenciaName) {
    console.log('🚨 WARNING: Only residencia in parts, checking if we lost data...');
    
    const hasMoreData = (data.condominiumText && data.condominiumText.trim()) || 
                       (data.condominiumName && data.condominiumName.trim()) ||
                       (data.houseNumber && data.houseNumber.toString().trim()) ||
                       (data.apartment && data.apartment.toString().trim());
    
    if (hasMoreData) {
      console.log('🚨 CRITICAL ERROR: We have additional data but only residencia in parts!');
      console.log('Available data check:', {
        condominiumText: data.condominiumText,
        condominiumName: data.condominiumName,
        houseNumber: data.houseNumber,
        apartment: data.apartment
      });
      
      // Force rebuild to ensure we don't lose data
      if (data.houseNumber?.toString().trim() && !condominiumToAdd) {
        locationParts.push(data.houseNumber.toString().trim());
        console.log('🔄 RECOVERY: Added missing house number:', data.houseNumber);
      }
    }
  }
  
  // Build final string
  let result: string;
  if (locationParts.length > 0) {
    result = locationParts.join(' – ');
  } else {
    result = 'Ubicación no especificada';
  }
  
  console.log('🎯 FINAL LOCATION RESULT:', result);
  console.log('=== END BUILD COMPLETE LOCATION ===');
  
  // Debug logging for troubleshooting
  if (appointmentId) {
    logLocationDebug(appointmentId, {
      residenciaName: data.residenciaName,
      condominiumName: condominiumToAdd,
      houseNumber: numberToAdd,
      apartment: data.apartment,
      clientAddress: data.clientAddress,
      isExternal: data.isExternal || false
    }, result);
  }
  
  return result;
};
