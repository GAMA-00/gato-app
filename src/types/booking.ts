/**
 * TIPOS CENTRALIZADOS PARA SISTEMA DE RESERVAS
 * ============================================
 * 
 * Este archivo consolida todos los tipos relacionados con:
 * - Citas y reservas (Appointments & Bookings) 
 * - Estados y recurrencia
 * - Proveedores y servicios
 * - Validaciones y utilidades
 */

// ===== ENUMS Y TIPOS BASE =====

/** Estados posibles de una cita/reserva */
export type AppointmentStatus = 
  | 'pending'     // Pendiente de aprobación
  | 'confirmed'   // Confirmada por el proveedor
  | 'completed'   // Servicio completado
  | 'cancelled'   // Cancelada por cualquier parte
  | 'rejected'    // Rechazada por el proveedor
  | 'rescheduled'; // Reagendada

/** Tipos de recurrencia normalizados */
export type RecurrenceType = 
  | 'none'      // Una sola vez
  | 'weekly'    // Cada semana
  | 'biweekly'  // Cada 2 semanas (quincenal)
  | 'monthly'   // Cada mes

/** Roles de usuario en el sistema */
export type UserRole = 'client' | 'provider' | 'admin';

// ===== INTERFACES PRINCIPALES =====

/** 
 * Cita/Reserva completa (base de datos)
 * Representa una cita tal como está almacenada en Supabase
 */
export interface BaseAppointment {
  id: string;
  provider_id: string;
  client_id: string;
  listing_id: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  status: AppointmentStatus;
  recurrence: string; // Raw value from DB
  notes?: string;
  created_at: string;
  
  // Campos opcionales de cliente
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  
  // Campos opcionales de proveedor
  provider_name?: string;
  
  // Campos de recurrencia
  is_recurring_instance?: boolean;
  recurrence_group_id?: string;
  recurring_rule_id?: string;
  
  // Campos de administración
  admin_notes?: string;
  last_modified_at?: string;
  last_modified_by?: string;
  
  // Campos de pago
  final_price?: number;
  stripe_payment_intent_id?: string;
  
  // Otros
  external_booking?: boolean;
  residencia_id?: string;
}

/**
 * Reserva procesada para el cliente
 * Versión simplificada y enriquecida para mostrar en la UI del cliente
 */
export interface ClientBooking {
  id: string;
  serviceName: string;
  subcategory: string;
  date: Date; // Procesada desde start_time
  status: AppointmentStatus;
  recurrence: string; // Raw value
  providerId: string;
  providerName: string;
  location: string; // Dirección completa construida
  isRated: boolean;
  notes?: string; // Para detectar si fue saltada
  
  // Campos opcionales de instancia recurrente
  isRecurringInstance?: boolean;
  isRescheduled?: boolean;
  originalRecurrenceGroupId?: string;
  originalAppointmentId?: string;
  
  // IDs de referencia
  listingId?: string;
  recurrenceGroupId?: string;
}

/**
 * Información de recurrencia procesada
 * Para mostrar en la UI con colores y etiquetas
 */
export interface RecurrenceInfo {
  type: RecurrenceType;
  label: string;      // "Semanal", "Quincenal", etc.
  color: string;      // Clases CSS para styling
  icon: string;       // Nombre del ícono de Lucide
}

// ===== INTERFACES DE PROVEEDOR =====

/**
 * Datos básicos del proveedor
 * Información esencial del proveedor
 */
export interface ProviderData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  about_me?: string;
  avatar_url?: string;
  experience_years?: number;
  average_rating?: number;
  certification_files?: any[];
  certificationFiles?: CertificationFile[];
  hasCertifications?: boolean;
  servicesCompleted?: number;
  role?: string;
  created_at?: string; // Para cálculo de nivel de proveedor
}

/**
 * Proveedor procesado para resultados de búsqueda
 * Versión enriquecida con datos calculados
 */
export interface ProcessedProvider {
  id: string;
  name: string;
  avatar: string | null;
  rating: number;
  ratingCount: number;
  price: number;
  duration: number;
  serviceName: string;
  serviceId: string;
  listingId: string;
  aboutMe: string;
  serviceDescription?: string;
  experience: number;
  servicesCompleted: number;
  recurringClients: number;
  galleryImages: string[];
  hasCertifications: boolean;
  joinDate?: Date; // Para cálculo de nivel
}

// ===== INTERFACES DE SERVICIO =====

/**
 * Variante de servicio
 * Diferentes opciones dentro del mismo servicio
 */
export interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  duration: number;
}

/**
 * Detalle completo de un servicio
 * Para la página de detalle del servicio
 */
export interface ServiceDetailData {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration: number;
  provider_id: string;
  service_type_id: string;
  is_active: boolean;
  gallery_images?: string[];
  galleryImages?: string[];
  
  // Relaciones
  service_type?: {
    id?: string;
    name?: string;
    category?: {
      id?: string;
      name?: string;
      label?: string;
    }
  };
  provider: ProviderData;
  serviceVariants?: ServiceVariant[];
  clientResidencia?: ClientResidencia;
  recurringClients?: number;
}

/**
 * Archivo de certificación
 * Para proveedores con certificaciones
 */
export interface CertificationFile {
  name: string;
  url: string;
  type: string;
  size?: number;
}

/**
 * Residencia del cliente
 * Información de ubicación del cliente
 */
export interface ClientResidencia {
  id?: string;
  name: string;
  address?: string;
}

// ===== INTERFACES DE DISPONIBILIDAD =====

/**
 * Slot de tiempo disponible
 * Para mostrar horarios disponibles al cliente
 */
export interface TimeSlot {
  time: string;          // "09:00", "10:30", etc.
  isAvailable: boolean;  // Si está disponible
  available: boolean;    // Alias para compatibilidad
  conflictReason?: string; // Razón si no está disponible
}

/**
 * Disponibilidad semanal del proveedor
 * Configuración base de horarios de trabajo
 */
export interface WeeklyAvailability {
  [day: string]: {
    enabled: boolean;
    timeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
}

// ===== INTERFACES DE MODALES Y UI =====

/**
 * Props para modal de reagendar
 * Parámetros necesarios para reagendar una cita
 */
export interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  providerId: string;
  isRecurring: boolean;
  currentDate: Date;
  serviceDuration: number;
  recurrence?: string;
  listingId?: string;
  recurrenceGroupId?: string;
}

/**
 * Props para modal de cancelar
 * Parámetros necesarios para cancelar una cita
 */
export interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  isRecurring: boolean;
  appointmentDate: Date;
}

/**
 * Preferencias de reserva del cliente
 * Para el proceso de booking
 */
export interface BookingPreferences {
  frequency?: string;
  selectedDays?: number[];
  timeSlot?: string;
  timePreference?: string;
}

// ===== TIPOS DE VALIDACIÓN =====

/**
 * Resultado de validación de disponibilidad
 * Para verificar si un horario está disponible
 */
export interface AvailabilityValidation {
  isAvailable: boolean;
  conflicts: string[];
  suggestions?: TimeSlot[];
}

/**
 * Resultado de validación de recurrencia
 * Para verificar si una recurrencia es válida
 */
export interface RecurrenceValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ===== TIPOS DE UTILIDAD =====

/**
 * Filtros para búsqueda de citas
 * Para filtrar listas de citas
 */
export interface AppointmentFilters {
  status?: AppointmentStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  recurrenceType?: RecurrenceType[];
  providerId?: string;
  clientId?: string;
}

/**
 * Estadísticas de reservas
 * Para dashboards y métricas
 */
export interface BookingStats {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  byRecurrence: Record<RecurrenceType, number>;
  thisWeek: number;
  thisMonth: number;
}

// ===== EXPORTACIONES PARA COMPATIBILIDAD =====

/** @deprecated Use AppointmentStatus instead */
export type OrderStatus = AppointmentStatus;

/** @deprecated Use RecurrenceType instead */
export type RecurrencePattern = RecurrenceType;

/** @deprecated Use BaseAppointment instead */
export interface Appointment extends Omit<BaseAppointment, 'start_time' | 'end_time' | 'created_at'> {
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  serviceId: string;
  clientId: string;
  providerId: string;
  recurrence: RecurrencePattern;
  status: OrderStatus;
  residencia?: string;
  apartment?: string;
  serviceName?: string;
  clientName?: string;
  providerName?: string;
  adminNotes?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
  finalPrice?: number;
  stripePaymentIntentId?: string;
}