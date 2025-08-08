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
 * Validación optimista mejorada para conflictos de recurrencia
 * Permite que la reserva continúe y valida en el backend con mejor logging
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
  confidence: 'high' | 'medium' | 'low';
} {
  const warnings: string[] = [];
  let shouldProceed = true;
  let confidence: 'high' | 'medium' | 'low' = 'high';

  console.log(`🔍 Validación optimista mejorada para recurrencia ${config.type}`);
  console.log(`📅 Slot: ${format(slotStart, 'yyyy-MM-dd HH:mm')} - ${format(slotEnd, 'HH:mm')}`);
  console.log(`📊 Citas existentes a evaluar: ${existingAppointments.length}`);

  // Para citas únicas, validación directa
  if (config.type === 'once') {
    const directConflicts = existingAppointments.filter(apt => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      const hasConflict = slotStart < aptEnd && slotEnd > aptStart;
      
      if (hasConflict) {
        console.log(`⚠️ Conflicto directo detectado con cita ${apt.id}: ${format(aptStart, 'yyyy-MM-dd HH:mm')}`);
      }
      
      return hasConflict;
    });

    return {
      isValid: directConflicts.length === 0,
      warnings: directConflicts.length > 0 ? [`${directConflicts.length} conflicto(s) directo(s) detectado(s)`] : [],
      shouldProceed: directConflicts.length === 0,
      confidence: directConflicts.length === 0 ? 'high' : 'low'
    };
  }

  // Para recurrencia, validación permisiva pero informativa
  console.log(`🔄 Evaluando recurrencia ${config.type} para futuros conflictos...`);
  
  const rangeEnd = addDays(slotStart, 90); // Validar 3 meses hacia adelante
  const futureOccurrences = generateRecurrenceOccurrences(
    config,
    slotStart,
    rangeEnd
  );

  console.log(`📈 ${futureOccurrences.length} ocurrencias futuras generadas para evaluación`);

  const conflictAnalysis = futureOccurrences.map(occurrence => {
    const occurrenceEnd = new Date(occurrence.date);
    occurrenceEnd.setHours(slotEnd.getHours(), slotEnd.getMinutes());

    const conflicts = existingAppointments.filter(apt => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      return occurrence.date < aptEnd && occurrenceEnd > aptStart;
    });

    return {
      date: occurrence.date,
      conflicts: conflicts.length,
      appointmentIds: conflicts.map(apt => apt.id)
    };
  }).filter(analysis => analysis.conflicts > 0);

  const totalConflicts = conflictAnalysis.length;

  if (totalConflicts > 0) {
    console.log(`⚠️ ${totalConflicts} conflictos potenciales detectados en ocurrencias futuras:`);
    conflictAnalysis.forEach(analysis => {
      console.log(`  📅 ${format(analysis.date, 'yyyy-MM-dd')}: ${analysis.conflicts} conflicto(s)`);
    });
    
    warnings.push(`${totalConflicts} posibles conflictos en futuras ocurrencias`);
    
    // Ajustar confianza basada en número de conflictos
    if (totalConflicts > futureOccurrences.length * 0.5) {
      confidence = 'low';
      warnings.push('Alto porcentaje de conflictos detectados');
    } else if (totalConflicts > futureOccurrences.length * 0.2) {
      confidence = 'medium';
      warnings.push('Conflictos moderados detectados');
    } else {
      confidence = 'high';
      warnings.push('Pocos conflictos detectados');
    }
  }

  if (config.type === 'monthly') {
    const pattern = getWeekPattern(slotStart);
    warnings.push(`Patrón mensual: ${pattern.description}`);
    console.log(`📊 Patrón mensual configurado: ${pattern.description}`);
  }

  // Para recurrencia, siempre proceder pero con información detallada
  console.log(`✅ Validación optimista completada - Proceder: ${shouldProceed}, Confianza: ${confidence}`);
  
  return {
    isValid: true, // Siempre optimista para recurrencia
    warnings,
    shouldProceed: true, // Permitir continuar siempre
    confidence
  };
}

/**
 * Función de pre-validación específica para reservas recurrentes
 */
export function preValidateRecurringBooking(
  config: OptimizedRecurrenceConfig,
  slotStart: Date,
  slotEnd: Date
): {
  canProceed: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let canProceed = true;

  console.log(`🔧 Pre-validación para reserva recurrente: ${config.type}`);

  // Validar que la fecha de inicio no esté en el pasado
  const now = new Date();
  if (slotStart < now) {
    warnings.push('La fecha de inicio está en el pasado');
    recommendations.push('Selecciona una fecha futura');
    canProceed = false;
  }

  // Validar duración razonable del slot
  const duration = slotEnd.getTime() - slotStart.getTime();
  const hours = duration / (1000 * 60 * 60);
  
  if (hours > 8) {
    warnings.push('Duración del servicio muy extensa (>8 horas)');
    recommendations.push('Considera dividir en múltiples sesiones');
  }

  if (hours < 0.25) {
    warnings.push('Duración del servicio muy corta (<15 minutos)');
    recommendations.push('Verifica la duración del servicio');
  }

  // Validaciones específicas por tipo de recurrencia
  switch (config.type) {
    case 'monthly':
      const pattern = getWeekPattern(slotStart);
      if (pattern.occurrenceNumber > 4) {
        warnings.push('Cuidado: Es el último fin de semana del mes, algunos meses podrían no tener esta fecha');
        recommendations.push('Considera usar una semana anterior para mayor consistencia');
      }
      break;
      
    case 'weekly':
      recommendations.push('Recurrencia semanal configurada correctamente');
      break;
      
    case 'biweekly':
      recommendations.push('Recurrencia quincenal configurada correctamente');
      break;
      
    case 'triweekly':
      recommendations.push('Recurrencia trisemanal configurada correctamente');
      break;
  }

  console.log(`🎯 Pre-validación completada: ${canProceed ? 'PASSED' : 'FAILED'}`);
  return { canProceed, warnings, recommendations };
}