/**
 * SISTEMA CENTRALIZADO DE RECURRENCIA
 * ===================================
 * 
 * Punto de entrada principal para todo el sistema de recurrencia.
 * Exporta todas las funcionalidades de forma organizada.
 */

// ===== TIPOS =====
export type {
  RecurrenceType,
  RecurrenceInstanceStatus,
  RecurrenceInfo,
  RecurringRule,
  RecurrenceRuleConfig,
  RecurrenceInstance,
  RecurringBookingData,
  RecurrenceGenerationOptions,
  RecurrenceValidationResult,
  RecurrenceSelectorOption,
  RecurrenceFilters,
  RecurrenceStats,
  RecurrenceSystemConfig
} from './types';

// ===== CONFIGURACIÓN =====
export {
  RECURRENCE_INFO_MAP,
  RECURRENCE_SELECTOR_OPTIONS,
  DEFAULT_RECURRENCE_CONFIG,
  RECURRENCE_LIMITS,
  RECURRENCE_ERROR_MESSAGES,
  RECURRENCE_SUCCESS_MESSAGES,
  DATE_CONFIG,
  WEEKDAYS,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT_NAMES
} from './config';

// ===== UTILIDADES =====
export {
  normalizeRecurrence,
  getRecurrenceInfo,
  isRecurring,
  recurrenceTypeToString,
  calculateNextOccurrence,
  findFirstValidOccurrence,
  shouldGenerateInstance,
  validateRecurrenceConfig,
  validateTimeFormat,
  detectRecurrenceConflicts,
  formatRecurrenceDisplay,
  getRecurrenceDescription,
  debugRecurrence
} from './utils';

// ===== GENERADOR =====
export {
  generateRecurringInstances,
  generateMultipleRecurringInstances,
  convertInstancesToAppointments,
  generateFutureInstancesFromAppointment,
  debugRecurrenceGeneration
} from './generator';

// ===== IMPORTACIONES PARA FUNCIONES DE CONVENIENCIA =====
import { 
  normalizeRecurrence as normalize,
  getRecurrenceInfo as getInfo,
  isRecurring as checkRecurring,
  validateRecurrenceConfig as validateConfig,
  debugRecurrence as debugRec
} from './utils';
import type { RecurrenceType } from './types';

// ===== FUNCIONES DE CONVENIENCIA =====

/**
 * Función todo-en-uno para obtener información de recurrencia
 */
export function getRecurrenceData(recurrence: string | null | undefined) {
  const normalized = normalize(recurrence);
  const info = getInfo(recurrence);
  const isRecurrentType = checkRecurring(recurrence);
  
  return {
    type: normalized,
    info,
    isRecurring: isRecurrentType,
    label: info.label,
    color: info.color,
    icon: info.icon,
    description: info.description
  };
}

/**
 * Función simplificada para validar una recurrencia
 */
export function validateRecurrence(
  recurrenceType: RecurrenceType,
  startDate: Date,
  endDate?: Date
) {
  const validationEndDate = endDate || new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 año por defecto
  
  return validateConfig(
    recurrenceType,
    startDate,
    validationEndDate
  );
}

/**
 * Función helper para debugging completo
 */
export function debugRecurrenceSystem(data: any, context: string = '') {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log(`🔍 ${context} === RECURRENCE SYSTEM DEBUG ===`);
  
  if (Array.isArray(data)) {
    console.log(`📊 Array with ${data.length} items`);
    data.slice(0, 3).forEach((item, i) => {
      console.log(`  Item ${i + 1}:`, {
        id: item.id,
        recurrence: item.recurrence,
        is_recurring_instance: item.is_recurring_instance,
        start_time: item.start_time
      });
    });
  } else {
    debugRec(data, context);
  }
  
  console.log('==========================================');
}