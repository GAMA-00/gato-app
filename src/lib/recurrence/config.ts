/**
 * CONFIGURACIÓN CENTRALIZADA DEL SISTEMA DE RECURRENCIA
 * ====================================================
 * 
 * Este archivo contiene toda la configuración y constantes del sistema de recurrencia
 */

import { RecurrenceInfo, RecurrenceType, RecurrenceSelectorOption, RecurrenceSystemConfig } from './types';

// ===== INFORMACIÓN DE TIPOS DE RECURRENCIA =====

/**
 * Mapeo completo de información para cada tipo de recurrencia
 */
export const RECURRENCE_INFO_MAP: Record<RecurrenceType, RecurrenceInfo> = {
  none: {
    type: 'none',
    label: 'Una vez',
    shortLabel: 'Una vez',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: 'Calendar',
    description: 'Servicio único, no se repetirá'
  },
  once: {
    type: 'once',
    label: 'Una vez',
    shortLabel: 'Una vez',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: 'Calendar',
    description: 'Servicio único, no se repetirá'
  },
  daily: {
    type: 'daily',
    label: 'Diaria',
    shortLabel: 'Dia',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: 'CalendarClock',
    description: 'Se repite todos los días a la misma hora'
  },
  weekly: {
    type: 'weekly',
    label: 'Semanal',
    shortLabel: 'Sem',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: 'RotateCcw',
    description: 'Se repite cada semana en el mismo día y hora'
  },
  biweekly: {
    type: 'biweekly',
    label: 'Quincenal',
    shortLabel: 'Quin',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: 'Repeat2',
    description: 'Se repite cada 2 semanas en el mismo día y hora'
  },
  triweekly: {
    type: 'triweekly',
    label: 'Trisemanal',
    shortLabel: 'Tris',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: 'Repeat',
    description: 'Se repite cada 3 semanas en el mismo día y hora'
  },
  monthly: {
    type: 'monthly',
    label: 'Mensual',
    shortLabel: 'Men',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: 'Calendar',
    description: 'Se repite cada mes en el mismo día y hora'
  }
};

// ===== OPCIONES PARA SELECTORES DE UI =====

/**
 * Opciones predefinidas para selectores de recurrencia
 */
export const RECURRENCE_SELECTOR_OPTIONS: RecurrenceSelectorOption[] = [
  {
    value: 'once',
    label: 'Una vez',
    description: 'Servicio único',
    icon: 'Calendar',
    popular: true
  },
  {
    value: 'daily',
    label: 'Diaria',
    description: 'Todos los días',
    icon: 'CalendarClock',
    popular: true
  },
  {
    value: 'weekly',
    label: 'Semanal',
    description: 'Cada semana',
    icon: 'RotateCcw',
    popular: true
  },
  {
    value: 'biweekly',
    label: 'Quincenal',
    description: 'Cada 2 semanas',
    icon: 'Repeat2',
    popular: true
  },
  {
    value: 'triweekly',
    label: 'Trisemanal',
    description: 'Cada 3 semanas',
    icon: 'Repeat',
    popular: true
  },
  {
    value: 'monthly',
    label: 'Mensual',
    description: 'Cada mes',
    icon: 'Calendar'
  }
];

// ===== CONFIGURACIÓN DEL SISTEMA =====

/**
 * Configuración por defecto del sistema de recurrencia
 */
export const DEFAULT_RECURRENCE_CONFIG: RecurrenceSystemConfig = {
  maxInstancesPerRule: 50,        // Máximo de instancias por regla
  defaultLookaheadWeeks: 12,      // Semanas hacia adelante por defecto
  enableConflictDetection: true,  // Detectar conflictos automáticamente
  autoGenerateInstances: true,    // Generar instancias automáticamente
  cleanupOldInstances: false      // Limpiar instancias antiguas
};

// ===== CONSTANTES DE VALIDACIÓN =====

/**
 * Límites y validaciones para el sistema
 */
export const RECURRENCE_LIMITS = {
  MAX_INSTANCES_PER_GENERATION: 100,
  MAX_LOOKAHEAD_WEEKS: 52,
  MIN_LOOKAHEAD_WEEKS: 1,
  MAX_RECURRENCE_RULES_PER_PROVIDER: 100,
  MAX_RECURRENCE_RULES_PER_CLIENT: 50
};

/**
 * Mensajes de error estandarizados
 */
export const RECURRENCE_ERROR_MESSAGES = {
  INVALID_TYPE: 'Tipo de recurrencia no válido',
  INVALID_DATE_RANGE: 'Rango de fechas no válido',
  MAX_INSTANCES_EXCEEDED: 'Se ha excedido el máximo de instancias permitidas',
  CONFLICT_DETECTED: 'Se detectó un conflicto con citas existentes',
  RULE_NOT_FOUND: 'No se encontró la regla de recurrencia',
  PROVIDER_NOT_FOUND: 'No se encontró el proveedor',
  CLIENT_NOT_FOUND: 'No se encontró el cliente',
  INVALID_TIME_FORMAT: 'Formato de hora no válido (debe ser HH:mm)',
  PAST_DATE_NOT_ALLOWED: 'No se pueden crear reglas para fechas pasadas'
};

/**
 * Mensajes de éxito estandarizados
 */
export const RECURRENCE_SUCCESS_MESSAGES = {
  RULE_CREATED: 'Regla de recurrencia creada exitosamente',
  RULE_UPDATED: 'Regla de recurrencia actualizada exitosamente',
  RULE_DELETED: 'Regla de recurrencia eliminada exitosamente',
  INSTANCES_GENERATED: 'Instancias generadas exitosamente',
  BOOKING_CREATED: (type: RecurrenceType) => {
    const info = RECURRENCE_INFO_MAP[type];
    return type === 'once' || type === 'none' 
      ? '¡Cita creada exitosamente!' 
      : `¡Servicio recurrente ${info.label.toLowerCase()} creado exitosamente!`;
  }
};

// ===== CONFIGURACIÓN DE FECHAS =====

/**
 * Configuración para trabajar con fechas y horarios
 */
export const DATE_CONFIG = {
  DEFAULT_TIMEZONE: 'America/Costa_Rica',
  TIME_FORMAT: 'HH:mm',
  DATE_FORMAT: 'yyyy-MM-dd',
  DATETIME_FORMAT: 'yyyy-MM-dd HH:mm:ss',
  DISPLAY_DATE_FORMAT: 'dd/MM/yyyy',
  DISPLAY_TIME_FORMAT: 'h:mm a'
};

/**
 * Días de la semana (0 = domingo, 6 = sábado)
 */
export const WEEKDAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

/**
 * Nombres de días en español
 */
export const WEEKDAY_NAMES = {
  [WEEKDAYS.SUNDAY]: 'Domingo',
  [WEEKDAYS.MONDAY]: 'Lunes',
  [WEEKDAYS.TUESDAY]: 'Martes',
  [WEEKDAYS.WEDNESDAY]: 'Miércoles',
  [WEEKDAYS.THURSDAY]: 'Jueves',
  [WEEKDAYS.FRIDAY]: 'Viernes',
  [WEEKDAYS.SATURDAY]: 'Sábado'
};

/**
 * Nombres cortos de días
 */
export const WEEKDAY_SHORT_NAMES = {
  [WEEKDAYS.SUNDAY]: 'Dom',
  [WEEKDAYS.MONDAY]: 'Lun',
  [WEEKDAYS.TUESDAY]: 'Mar',
  [WEEKDAYS.WEDNESDAY]: 'Mié',
  [WEEKDAYS.THURSDAY]: 'Jue',
  [WEEKDAYS.FRIDAY]: 'Vie',
  [WEEKDAYS.SATURDAY]: 'Sáb'
};