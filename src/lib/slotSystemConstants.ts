/**
 * Sistema de Slots - Constantes Globales
 * Esta es la ÚNICA fuente de verdad para la configuración de slots
 * 
 * IMPORTANTE: Todos los slots del sistema son de 30 minutos.
 * Esta es una regla global, permanente y sin excepciones.
 */

export const SLOT_SYSTEM = {
  /** Duración de cada slot en minutos (unidad mínima reservable) */
  SLOT_SIZE_MINUTES: 30,
  
  /** Duración del lock durante checkout en minutos */
  CHECKOUT_LOCK_MINUTES: 5,
  
  /** Porcentaje de descuento para slots recomendados */
  RECOMMENDED_DISCOUNT_PERCENT: 10,
  
  /** Días adelante para generar slots */
  DEFAULT_DAYS_AHEAD: 60,
} as const;

/**
 * Calcula el número de slots necesarios para una duración de servicio.
 * Siempre redondea hacia arriba para garantizar cobertura completa.
 * 
 * @param serviceDurationMinutes - Duración del servicio en minutos
 * @returns Número de slots de 30 minutos necesarios
 * 
 * @example
 * calculateRequiredSlots(45) // => 2 slots (60 min)
 * calculateRequiredSlots(60) // => 2 slots (60 min)
 * calculateRequiredSlots(90) // => 3 slots (90 min)
 */
export function calculateRequiredSlots(serviceDurationMinutes: number): number {
  if (serviceDurationMinutes <= 0) return 1;
  return Math.ceil(serviceDurationMinutes / SLOT_SYSTEM.SLOT_SIZE_MINUTES);
}

/**
 * Calcula la duración total en minutos basada en número de slots.
 * 
 * @param slotCount - Número de slots reservados
 * @returns Duración total en minutos
 */
export function calculateTotalDuration(slotCount: number): number {
  return slotCount * SLOT_SYSTEM.SLOT_SIZE_MINUTES;
}

/**
 * Calcula el monto con descuento para slots recomendados.
 * 
 * @param subtotal - Monto original sin descuento
 * @param isRecommendedSlot - Si el slot inicial es recomendado
 * @returns Objeto con detalles del descuento
 */
export function calculateRecommendedDiscount(
  subtotal: number, 
  isRecommendedSlot: boolean
): {
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  finalTotal: number;
} {
  const discountPercent = isRecommendedSlot ? SLOT_SYSTEM.RECOMMENDED_DISCOUNT_PERCENT : 0;
  const discountAmount = isRecommendedSlot 
    ? Math.round((subtotal * discountPercent / 100) * 100) / 100  // Round to 2 decimals
    : 0;
  
  return {
    subtotal,
    discountAmount,
    discountPercent,
    finalTotal: Math.round((subtotal - discountAmount) * 100) / 100
  };
}

/**
 * Valida si hay suficientes slots consecutivos disponibles.
 * 
 * @param availableSlots - Array de IDs de slots disponibles en orden
 * @param requiredCount - Número de slots consecutivos requeridos
 * @param slotTimes - Map de ID a tiempo para validar contigüidad
 * @returns true si hay suficientes slots consecutivos
 */
export function hasEnoughConsecutiveSlots(
  availableSlots: string[],
  requiredCount: number,
  slotTimes: Map<string, number> // minutes since midnight
): boolean {
  if (availableSlots.length < requiredCount) return false;
  
  for (let i = 0; i <= availableSlots.length - requiredCount; i++) {
    let isConsecutive = true;
    
    for (let j = 1; j < requiredCount; j++) {
      const prevTime = slotTimes.get(availableSlots[i + j - 1]) ?? 0;
      const currTime = slotTimes.get(availableSlots[i + j]) ?? 0;
      
      if (currTime - prevTime !== SLOT_SYSTEM.SLOT_SIZE_MINUTES) {
        isConsecutive = false;
        break;
      }
    }
    
    if (isConsecutive) return true;
  }
  
  return false;
}
