/**
 * SISTEMA OPTIMIZADO DE RECURRENCIA
 * ==================================
 * 
 * Sistema mejorado que integra toda la lógica de recurrencia con:
 * - Validación optimista para mejor UX
 * - Lógica mensual basada en patrones semanales
 * - Manejo robusto de excepciones
 */

import { format, addDays, addWeeks, addMonths, isSameDay, startOfDay } from 'date-fns';
import { calculateMonthlyByWeekPattern, getWeekPattern } from './monthlyRecurrenceUtils';

export interface OptimizedRecurrenceConfig {
  type: 'once' | 'weekly' | 'biweekly' | 'triweekly' | 'monthly';
  startDate: Date;
  endDate?: Date; // Opcional para recurrencia infinita
  maxOccurrences?: number; // Límite de ocurrencias
}

export interface RecurrenceOccurrence {
  date: Date;
  isOriginal: boolean;
  weekPattern?: string; // Para recurrencia mensual
}

/**
 * Genera todas las ocurrencias de una cita recurrente
 */
export function generateRecurrenceOccurrences(
  config: OptimizedRecurrenceConfig,
  rangeStart: Date,
  rangeEnd: Date
): RecurrenceOccurrence[] {
  const occurrences: RecurrenceOccurrence[] = [];
  const { type, startDate, endDate, maxOccurrences } = config;

  console.log(`🔄 Generando ocurrencias para recurrencia ${type} desde ${format(rangeStart, 'yyyy-MM-dd')} hasta ${format(rangeEnd, 'yyyy-MM-dd')}`);

  // Si es una vez, solo agregar la fecha original si está en el rango
  if (type === 'once') {
    if (startDate >= rangeStart && startDate <= rangeEnd) {
      occurrences.push({
        date: startDate,
        isOriginal: true
      });
    }
    return occurrences;
  }

  let currentDate = new Date(startDate);
  let count = 0;
  const maxIterations = maxOccurrences || 365; // Límite de seguridad

  // Para recurrencia mensual, obtener el patrón semanal
  let weekPattern = '';
  if (type === 'monthly') {
    const pattern = getWeekPattern(startDate);
    weekPattern = pattern.description;
    console.log(`📅 Patrón semanal para recurrencia mensual: ${weekPattern}`);
  }

  while (count < maxIterations && currentDate <= rangeEnd) {
    // Si la fecha está en el rango, agregarla
    if (currentDate >= rangeStart) {
      occurrences.push({
        date: new Date(currentDate),
        isOriginal: isSameDay(currentDate, startDate),
        weekPattern
      });
    }

    // Calcular la siguiente ocurrencia
    switch (type) {
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      
      case 'biweekly':
        currentDate = addWeeks(currentDate, 2);
        break;
      
      case 'triweekly':
        currentDate = addWeeks(currentDate, 3);
        break;
      
      case 'monthly':
        // Usar el nuevo sistema basado en patrones semanales
        currentDate = calculateMonthlyByWeekPattern(currentDate, currentDate);
        break;
      
      default:
        console.warn(`⚠️ Tipo de recurrencia no soportado: ${type}`);
        return occurrences;
    }

    count++;

    // Verificar límites
    if (endDate && currentDate > endDate) break;
    if (maxOccurrences && count >= maxOccurrences) break;
  }

  console.log(`✅ Generadas ${occurrences.length} ocurrencias para recurrencia ${type}`);
  return occurrences;
}

/**
 * Valida si una fecha específica debe tener una ocurrencia recurrente
 */
export function shouldHaveRecurrenceOn(
  targetDate: Date,
  config: OptimizedRecurrenceConfig
): boolean {
  const { type, startDate } = config;

  if (type === 'once') {
    return isSameDay(targetDate, startDate);
  }

  // Generar las ocurrencias en un rango pequeño alrededor de la fecha objetivo
  const rangeStart = addDays(targetDate, -1);
  const rangeEnd = addDays(targetDate, 1);
  
  const occurrences = generateRecurrenceOccurrences(config, rangeStart, rangeEnd);
  
  return occurrences.some(occurrence => isSameDay(occurrence.date, targetDate));
}

/**
 * Obtiene la próxima ocurrencia de una cita recurrente después de una fecha específica
 */
export function getNextRecurrenceOccurrence(
  config: OptimizedRecurrenceConfig,
  afterDate: Date = new Date()
): Date | null {
  const { type, startDate } = config;
  
  if (type === 'once') {
    return startDate > afterDate ? startDate : null;
  }

  // Generar ocurrencias en un rango futuro
  const rangeStart = startOfDay(afterDate);
  const rangeEnd = addDays(rangeStart, 365); // Un año hacia adelante
  
  const occurrences = generateRecurrenceOccurrences(config, rangeStart, rangeEnd);
  const futureOccurrences = occurrences.filter(occ => occ.date > afterDate);
  
  return futureOccurrences.length > 0 ? futureOccurrences[0].date : null;
}

/**
 * Formatea la descripción de una recurrencia para mostrar al usuario
 */
export function formatRecurrenceDescription(config: OptimizedRecurrenceConfig): string {
  const { type, startDate } = config;
  
  switch (type) {
    case 'once':
      return 'Una sola vez';
    
    case 'weekly':
      return 'Cada semana';
    
    case 'biweekly':
      return 'Cada dos semanas';
    
    case 'triweekly':
      return 'Cada tres semanas';
    
    case 'monthly':
      const pattern = getWeekPattern(startDate);
      return `Cada ${pattern.description}`;
    
    default:
      return 'Recurrencia desconocida';
  }
}

/**
 * Validación optimista para conflictos de recurrencia
 * Permite que la reserva continúe y valida en el backend
 */
export function validateRecurrenceOptimistically(
  config: OptimizedRecurrenceConfig,
  slotStart: Date,
  slotEnd: Date,
  existingAppointments: any[] = []
): {
  isValid: boolean;
  warnings: string[];
  shouldProceed: boolean;
} {
  const warnings: string[] = [];
  let shouldProceed = true;

  console.log(`🔍 Validación optimista para recurrencia ${config.type}`);

  // Para citas únicas, validación simple
  if (config.type === 'once') {
    const hasDirectConflict = existingAppointments.some(apt => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      return slotStart < aptEnd && slotEnd > aptStart;
    });

    return {
      isValid: !hasDirectConflict,
      warnings: hasDirectConflict ? ['Conflicto directo detectado'] : [],
      shouldProceed: !hasDirectConflict
    };
  }

  // Para recurrencia, hacer validación básica pero permisiva
  const rangeEnd = addDays(slotStart, 90); // Validar 3 meses hacia adelante
  const futureOccurrences = generateRecurrenceOccurrences(
    config,
    slotStart,
    rangeEnd
  );

  const conflictCount = futureOccurrences.filter(occurrence => {
    const occurrenceEnd = new Date(occurrence.date);
    occurrenceEnd.setHours(slotEnd.getHours(), slotEnd.getMinutes());

    return existingAppointments.some(apt => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      return occurrence.date < aptEnd && occurrenceEnd > aptStart;
    });
  }).length;

  if (conflictCount > 0) {
    warnings.push(`${conflictCount} posibles conflictos detectados en futuras ocurrencias`);
    // Pero seguimos permitiendo la reserva para mejor UX
  }

  if (config.type === 'monthly') {
    const pattern = getWeekPattern(slotStart);
    warnings.push(`Patrón mensual: ${pattern.description}`);
  }

  return {
    isValid: true, // Siempre optimista
    warnings,
    shouldProceed: true
  };
}