
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
  console.log('Input data:', data);

  // For external bookings, use the stored address
  if (data.isExternal && data.clientAddress) {
    console.log('Using external address:', data.clientAddress);
    return data.clientAddress;
  }

  const parts: string[] = [];
  
  // Add residencia name
  if (data.residenciaName?.trim()) {
    parts.push(data.residenciaName.trim());
    console.log('Added residencia:', data.residenciaName.trim());
  }
  
  // Add condominium name - prioritize condominiumText over condominiumName
  const condominiumName = data.condominiumText?.trim() || data.condominiumName?.trim();
  if (condominiumName) {
    parts.push(condominiumName);
    console.log('Added condominium:', condominiumName);
  }
  
  // Add house/apartment number - prioritize apartment, then house number
  const houseNumber = data.apartment?.toString().trim() || data.houseNumber?.toString().trim();
  if (houseNumber) {
    // Clean any existing prefixes
    const cleanNumber = houseNumber.replace(/^(casa\s*|#\s*)/i, '').trim();
    if (cleanNumber) {
      parts.push(cleanNumber);
      console.log('Added house number:', cleanNumber);
    }
  }
  
  console.log('Final parts array:', parts);
  
  // Return in the standardized format: Residencia – Condominio – Número
  const result = parts.length > 0 ? parts.join(' – ') : 'Ubicación no especificada';
  console.log('Final location result:', result);
  
  if (appointmentId) {
    logLocationDebug(appointmentId, {
      residenciaName: data.residenciaName,
      condominiumName: condominiumName,
      houseNumber: houseNumber,
      apartment: data.apartment,
      clientAddress: data.clientAddress,
      isExternal: data.isExternal || false
    }, result);
  }
  
  return result;
};
