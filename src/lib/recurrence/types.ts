/**
 * TIPOS CENTRALIZADOS DEL SISTEMA DE RECURRENCIA
 * ==============================================
 * 
 * Este archivo define todos los tipos relacionados con el sistema de recurrencia
 */

// ===== TIPOS BASE =====

/** Tipos de recurrencia normalizados */
export type RecurrenceType = 
  | 'none'      // Una sola vez
  | 'once'      // Alias para 'none' 
  | 'weekly'    // Cada semana
  | 'biweekly'  // Cada 2 semanas (quincenal)
  | 'monthly'   // Cada mes

/** Estados de instancias recurrentes */
export type RecurrenceInstanceStatus = 
  | 'scheduled'  // Programada
  | 'confirmed'  // Confirmada
  | 'completed'  // Completada
  | 'cancelled'  // Cancelada
  | 'rescheduled' // Reagendada

// ===== INTERFACES PRINCIPALES =====

/**
 * Información de recurrencia para UI
 * Contiene metadatos para mostrar en la interfaz
 */
export interface RecurrenceInfo {
  type: RecurrenceType;
  label: string;      // "Semanal", "Quincenal", etc.
  shortLabel: string; // "Sem", "Quin", etc.
  color: string;      // Clases CSS para styling
  icon: string;       // Nombre del ícono de Lucide
  description: string; // Descripción completa
}

/**
 * Regla de recurrencia base (desde la base de datos)
 */
export interface RecurringRule {
  id: string;
  client_id: string;
  provider_id: string;
  listing_id: string;
  recurrence_type: string;
  start_date: string;
  start_time: string;
  end_time: string;
  day_of_week: number | null;
  day_of_month: number | null;
  is_active: boolean;
  client_name?: string | null;
  notes?: string | null;
  client_address?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  created_at?: string;
  updated_at?: string;
  
  // Datos relacionados opcionales
  listings?: { title: string; duration?: number } | null;
}

/**
 * Configuración para crear una regla de recurrencia
 */
export interface RecurrenceRuleConfig {
  client_id: string;
  provider_id: string;
  listing_id: string;
  recurrence_type: RecurrenceType;
  start_date: Date;
  start_time: string; // "HH:mm" format
  end_time: string;   // "HH:mm" format
  client_name?: string;
  notes?: string;
  client_address?: string;
  client_phone?: string;
  client_email?: string;
}

/**
 * Instancia recurrente generada
 */
export interface RecurrenceInstance {
  id: string;                    // ID único generado
  recurring_rule_id: string;     // ID de la regla origen
  instance_date: Date;           // Fecha de esta instancia
  start_time: Date;              // Hora de inicio completa
  end_time: Date;                // Hora de fin completa
  status: RecurrenceInstanceStatus;
  notes?: string;
  
  // Metadatos calculados
  is_recurring_instance: true;
  client_id: string;
  provider_id: string;
  listing_id: string;
  service_title?: string;
  client_name?: string;
  complete_location?: string;
}

/**
 * Datos para crear una cita recurrente
 */
export interface RecurringBookingData {
  listingId: string;
  startTime: string;             // ISO string
  endTime: string;               // ISO string  
  recurrenceType: RecurrenceType;
  notes?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  customVariableSelections?: any;
  customVariablesTotalPrice?: number;
}

/**
 * Opciones para generar instancias
 */
export interface RecurrenceGenerationOptions {
  startDate: Date;
  endDate: Date;
  maxInstances?: number;         // Límite de seguridad
  excludeConflicts?: boolean;    // Omitir conflictos con citas existentes
  existingAppointments?: any[];  // Para detectar conflictos
}

/**
 * Resultado de validación de recurrencia
 */
export interface RecurrenceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  conflictingDates?: Date[];
}

/**
 * Opciones para selector de recurrencia
 */
export interface RecurrenceSelectorOption {
  value: RecurrenceType;
  label: string;
  description: string;
  icon: string;
  disabled?: boolean;
  popular?: boolean;
}

// ===== TIPOS DE UTILIDAD =====

/**
 * Filtros para búsqueda de reglas recurrentes
 */
export interface RecurrenceFilters {
  providerId?: string;
  clientId?: string;
  listingId?: string;
  recurrenceType?: RecurrenceType[];
  isActive?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Estadísticas de recurrencia
 */
export interface RecurrenceStats {
  totalRules: number;
  activeRules: number;
  byType: Record<RecurrenceType, number>;
  totalInstances: number;
  upcomingInstances: number;
  recurringClients: number;
}

/**
 * Configuración del sistema de recurrencia
 */
export interface RecurrenceSystemConfig {
  maxInstancesPerRule: number;
  defaultLookaheadWeeks: number;
  enableConflictDetection: boolean;
  autoGenerateInstances: boolean;
  cleanupOldInstances: boolean;
}