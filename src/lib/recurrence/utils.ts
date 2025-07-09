/**
 * UTILIDADES CENTRALIZADAS DEL SISTEMA DE RECURRENCIA
 * ==================================================
 * 
 * Este archivo contiene todas las funciones utilitarias para el manejo de recurrencia
 */

import { addWeeks, addMonths, addDays, getDay, format } from 'date-fns';
import { RecurrenceType, RecurrenceInfo, RecurrenceValidationResult } from './types';
import { 
  RECURRENCE_INFO_MAP, 
  RECURRENCE_ERROR_MESSAGES,
  WEEKDAY_NAMES 
} from './config';

// ===== FUNCIONES DE NORMALIZACIÓN =====

/**
 * Normaliza una cadena de recurrencia a RecurrenceType
 */
export function normalizeRecurrence(recurrence: string | null | undefined): RecurrenceType {
  if (!recurrence) return 'none';
  
  const normalized = recurrence.toLowerCase().trim();
  
  switch (normalized) {
    case 'once':
    case 'una vez':
    case 'single':
      return 'once';
    case 'weekly':
    case 'semanal':
    case 'week':
      return 'weekly';
    case 'biweekly':
    case 'quincenal':
    case 'bi-weekly':
    case 'cada dos semanas':
      return 'biweekly';
    case 'monthly':
    case 'mensual':
    case 'month':
      return 'monthly';
    case 'none':
    case 'ninguno':
    case 'no':
    default:
      return 'none';
  }
}

/**
 * Obtiene información completa de un tipo de recurrencia
 */
export function getRecurrenceInfo(recurrence: string | null | undefined): RecurrenceInfo {
  const normalizedType = normalizeRecurrence(recurrence);
  return RECURRENCE_INFO_MAP[normalizedType];
}

/**
 * Verifica si una recurrencia indica repetición
 */
export function isRecurring(recurrence: string | null | undefined): boolean {
  const normalized = normalizeRecurrence(recurrence);
  return normalized !== 'none' && normalized !== 'once';
}

/**
 * Convierte RecurrenceType a string de base de datos
 */
export function recurrenceTypeToString(type: RecurrenceType): string {
  return type === 'once' ? 'none' : type;
}

// ===== FUNCIONES DE CÁLCULO DE FECHAS =====

/**
 * Calcula la siguiente ocurrencia de una recurrencia
 */
export function calculateNextOccurrence(
  currentDate: Date, 
  recurrenceType: RecurrenceType, 
  originalDate?: Date
): Date {
  switch (recurrenceType) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    
    case 'biweekly':
      return addWeeks(currentDate, 2);
    
    case 'monthly':
      return addMonths(currentDate, 1);
    
    case 'once':
    case 'none':
    default:
      return currentDate; // No hay siguiente ocurrencia
  }
}

/**
 * Encuentra la primera ocurrencia válida para una recurrencia
 */
export function findFirstValidOccurrence(
  startDate: Date, 
  recurrenceType: RecurrenceType,
  ruleStartDate: Date,
  targetDayOfWeek?: number,
  targetDayOfMonth?: number
): Date {
  let candidate = new Date(Math.max(startDate.getTime(), ruleStartDate.getTime()));
  
  switch (recurrenceType) {
    case 'weekly':
      if (targetDayOfWeek !== undefined) {
        // Encontrar el próximo día de la semana correcto
        while (getDay(candidate) !== targetDayOfWeek) {
          candidate = addDays(candidate, 1);
        }
      }
      break;
      
    case 'biweekly':
      if (targetDayOfWeek !== undefined) {
        // Encontrar el próximo día correcto en el ciclo de 2 semanas
        while (getDay(candidate) !== targetDayOfWeek) {
          candidate = addDays(candidate, 1);
        }
        
        // Asegurar que esté en el ciclo correcto de 2 semanas
        while (true) {
          const daysDiff = Math.floor((candidate.getTime() - ruleStartDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff >= 0 && daysDiff % 14 === 0) {
            break;
          }
          candidate = addDays(candidate, 7);
        }
      }
      break;
      
    case 'monthly':
      if (targetDayOfMonth !== undefined) {
        // Establecer el día del mes correcto
        candidate.setDate(targetDayOfMonth);
        if (candidate < startDate) {
          candidate = addMonths(candidate, 1);
          candidate.setDate(targetDayOfMonth);
        }
      }
      break;
  }
  
  return candidate;
}

/**
 * Verifica si una fecha específica debe tener una instancia recurrente
 */
export function shouldGenerateInstance(
  targetDate: Date,
  originalDate: Date,
  recurrenceType: RecurrenceType
): boolean {
  if (recurrenceType === 'none' || recurrenceType === 'once') {
    return false;
  }
  
  const daysDiff = Math.floor((targetDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));
  
  switch (recurrenceType) {
    case 'weekly':
      return daysDiff >= 0 && daysDiff % 7 === 0 && getDay(targetDate) === getDay(originalDate);
    
    case 'biweekly':
      return daysDiff >= 0 && daysDiff % 14 === 0 && getDay(targetDate) === getDay(originalDate);
    
    case 'monthly':
      return targetDate.getDate() === originalDate.getDate() && targetDate >= originalDate;
    
    default:
      return false;
  }
}

// ===== FUNCIONES DE VALIDACIÓN =====

/**
 * Valida una configuración de recurrencia
 */
export function validateRecurrenceConfig(
  recurrenceType: RecurrenceType,
  startDate: Date,
  endDate: Date,
  dayOfWeek?: number,
  dayOfMonth?: number
): RecurrenceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validar tipo de recurrencia
  if (!Object.keys(RECURRENCE_INFO_MAP).includes(recurrenceType)) {
    errors.push(RECURRENCE_ERROR_MESSAGES.INVALID_TYPE);
  }
  
  // Validar fechas
  if (startDate >= endDate) {
    errors.push(RECURRENCE_ERROR_MESSAGES.INVALID_DATE_RANGE);
  }
  
  if (startDate < new Date()) {
    errors.push(RECURRENCE_ERROR_MESSAGES.PAST_DATE_NOT_ALLOWED);
  }
  
  // Validaciones específicas por tipo
  switch (recurrenceType) {
    case 'weekly':
    case 'biweekly':
      if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
        errors.push('Día de la semana no válido (debe ser 0-6)');
      }
      break;
      
    case 'monthly':
      if (dayOfMonth === undefined || dayOfMonth < 1 || dayOfMonth > 31) {
        errors.push('Día del mes no válido (debe ser 1-31)');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valida formato de hora (HH:mm)
 */
export function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Detecta conflictos con citas existentes
 */
export function detectRecurrenceConflicts(
  newStartTime: Date,
  newEndTime: Date,
  recurrenceType: RecurrenceType,
  existingAppointments: any[],
  maxLookahead: number = 12
): Date[] {
  if (recurrenceType === 'none' || recurrenceType === 'once') {
    return [];
  }
  
  const conflicts: Date[] = [];
  let currentDate = new Date(newStartTime);
  const endLookahead = addWeeks(newStartTime, maxLookahead);
  
  while (currentDate <= endLookahead) {
    // Verificar si hay conflicto en esta fecha
    const hasConflict = existingAppointments.some(apt => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      
      // Crear las fechas de la instancia actual
      const instanceStart = new Date(currentDate);
      instanceStart.setHours(newStartTime.getHours(), newStartTime.getMinutes(), 0, 0);
      
      const instanceEnd = new Date(currentDate);
      instanceEnd.setHours(newEndTime.getHours(), newEndTime.getMinutes(), 0, 0);
      
      // Verificar solapamiento
      return instanceStart < aptEnd && instanceEnd > aptStart;
    });
    
    if (hasConflict) {
      conflicts.push(new Date(currentDate));
    }
    
    // Avanzar a la siguiente ocurrencia
    currentDate = calculateNextOccurrence(currentDate, recurrenceType);
  }
  
  return conflicts;
}

// ===== FUNCIONES DE FORMATO =====

/**
 * Formatea información de recurrencia para mostrar en UI
 */
export function formatRecurrenceDisplay(
  recurrence: string | null | undefined,
  includeIcon: boolean = false
): string {
  const info = getRecurrenceInfo(recurrence);
  
  if (includeIcon) {
    return `${info.icon} ${info.label}`;
  }
  
  return info.label;
}

/**
 * Genera descripción detallada de una recurrencia
 */
export function getRecurrenceDescription(
  recurrenceType: RecurrenceType,
  startDate: Date,
  dayOfWeek?: number,
  dayOfMonth?: number
): string {
  const info = RECURRENCE_INFO_MAP[recurrenceType];
  
  if (recurrenceType === 'none' || recurrenceType === 'once') {
    return info.description;
  }
  
  let description = info.description;
  
  switch (recurrenceType) {
    case 'weekly':
    case 'biweekly':
      if (dayOfWeek !== undefined) {
        const dayName = WEEKDAY_NAMES[dayOfWeek];
        description += ` (${dayName}s)`;
      }
      break;
      
    case 'monthly':
      if (dayOfMonth !== undefined) {
        description += ` (día ${dayOfMonth})`;
      }
      break;
  }
  
  return description;
}

// ===== FUNCIONES DE DEBUG =====

/**
 * Registra información de debug para recurrencia
 */
export function debugRecurrence(appointment: any, prefix: string = ''): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log(`${prefix}=== RECURRENCE DEBUG ===`);
  console.log(`Type: ${appointment.recurrence}`);
  console.log(`Normalized: ${normalizeRecurrence(appointment.recurrence)}`);
  console.log(`Is Recurring: ${isRecurring(appointment.recurrence)}`);
  console.log(`Is Instance: ${appointment.is_recurring_instance}`);
  console.log(`Rule ID: ${appointment.recurring_rule_id}`);
  console.log(`Group ID: ${appointment.recurrence_group_id}`);
  console.log(`========================`);
}