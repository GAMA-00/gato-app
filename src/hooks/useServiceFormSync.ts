import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useAvailabilitySync } from './useAvailabilitySync';

/**
 * Hook para sincronizar automáticamente cambios en el service form
 * con Config Disponibilidad cuando se guarde o actualice un servicio
 */
export const useServiceFormSync = (listingId?: string) => {
  const { watch } = useFormContext();
  const { syncFromServiceToConfig } = useAvailabilitySync();
  
  const availability = watch('availability');

  useEffect(() => {
    // Solo sincronizar cuando se guarde/actualice un listing con ID válido
    if (listingId && availability) {
      console.log('🔄 Service form detectó cambios en availability, preparando sincronización...');
      
      // Usar timeout para permitir que el formulario termine de guardarse
      const timeoutId = setTimeout(() => {
        syncFromServiceToConfig(listingId);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [listingId, availability, syncFromServiceToConfig]);

  return null;
};