/**
 * UTILIDADES DE RECURRENCIA (LEGACY)
 * ===================================
 * 
 * DEPRECADO: Este archivo mantiene compatibilidad con código existente.
 * Para nuevos desarrollos, usar: import { ... } from '@/lib/recurrence'
 * 
 * @deprecated Use @/lib/recurrence instead
 */

// Re-exportar desde el nuevo sistema centralizado
export {
  normalizeRecurrence,
  getRecurrenceInfo,
  isRecurring,
  calculateNextOccurrence,
  shouldGenerateInstance,
  generateFutureInstancesFromAppointment as generateRecurringInstances,
  debugRecurrence,
  type RecurrenceType,
  type RecurrenceInfo
} from '@/lib/recurrence';