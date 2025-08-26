import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { useAvailabilitySync } from './useAvailabilitySync';

/**
 * Hook para sincronizar automáticamente cambios en el service form
 * con Config Disponibilidad cuando se guarde o actualice un servicio
 */
export const useServiceFormSync = (listingId?: string) => {
  const formContext = useFormContext();
  const { syncFromServiceToConfig } = useAvailabilitySync();
  const previousValuesRef = useRef<any>(null);
  
  // Early return if form context is not available
  if (!formContext) {
    console.warn('useServiceFormSync: Form context not available');
    return null;
  }
  
  const { watch } = formContext;
  
  const availability = watch('availability');
  const duration = watch('duration');
  const name = watch('name');
  const description = watch('description');
  const price = watch('price');
  const isPostPayment = watch('isPostPayment');

  useEffect(() => {
    // Solo sincronizar cuando se guarde/actualice un listing con ID válido
    if (listingId && availability) {
      const currentValues = {
        availability,
        duration,
        name,
        description,
        price,
        isPostPayment
      };

      // Comparar con valores anteriores para detectar cambios
      const hasChanges = !previousValuesRef.current || 
        JSON.stringify(previousValuesRef.current) !== JSON.stringify(currentValues);

      if (hasChanges) {
        console.log('🔄 Service form detectó cambios significativos:', {
          availability: availability !== previousValuesRef.current?.availability,
          duration: duration !== previousValuesRef.current?.duration,
          profile: name !== previousValuesRef.current?.name || 
                  description !== previousValuesRef.current?.description ||
                  price !== previousValuesRef.current?.price
        });
        
        // Usar timeout para permitir que el formulario termine de guardarse
        const timeoutId = setTimeout(() => {
          const needsSlotRegeneration = duration !== previousValuesRef.current?.duration ||
                                      availability !== previousValuesRef.current?.availability;
          syncFromServiceToConfig(listingId, needsSlotRegeneration);
        }, 2000);

        // Actualizar valores anteriores
        previousValuesRef.current = currentValues;

        return () => clearTimeout(timeoutId);
      }
    }
  }, [listingId, availability, duration, name, description, price, isPostPayment, syncFromServiceToConfig]);

  return null;
};