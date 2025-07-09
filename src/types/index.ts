/**
 * ÍNDICE CENTRAL DE TIPOS
 * ======================
 * 
 * Exporta todos los tipos centralizados del sistema
 * Uso: import { ClientBooking, AppointmentStatus } from '@/types'
 */

// ===== TIPOS DE RESERVAS Y CITAS =====
export type {
  // Estados y enums
  AppointmentStatus,
  RecurrenceType,
  UserRole,
  
  // Interfaces principales
  BaseAppointment,
  ClientBooking,
  RecurrenceInfo,
  
  // Proveedor
  ProviderData,
  ProcessedProvider,
  
  // Servicios
  ServiceVariant,
  ServiceDetailData,
  CertificationFile,
  
  // Disponibilidad
  TimeSlot,
  WeeklyAvailability,
  
  // Modales
  RescheduleModalProps,
  CancelModalProps,
  BookingPreferences,
  
  // Validación
  AvailabilityValidation,
  RecurrenceValidation,
  
  // Utilidades
  AppointmentFilters,
  BookingStats,
  
  // Compatibilidad (deprecated)
  OrderStatus,
  RecurrencePattern,
  Appointment,
} from './booking';

// ===== TIPOS DE SERVICIOS =====
export type {
  // Categorías
  ServiceCategory,
  
  // Variables personalizadas
  CustomVariableOption,
  CustomVariable,
  CustomVariableGroup,
  
  // Servicios
  Service,
  ServiceCategoryInfo,
  ServiceTypeInfo,
  ServiceItem,
  ServiceCategoryGroup,
  
  // Configuración
  PostPaymentConfig,
  CertificationConfig,
  
  // Disponibilidad
  DayAvailability,
  
  // Validación
  ServiceValidation,
  
  // Búsqueda
  ServiceFilters,
  ServiceSearchResult,
} from './service';

// ===== TIPOS DE UBICACIONES =====
export type {
  // Ubicaciones principales
  Residencia,
  Condominium,
  ClientResidencia,
  FormattedAddress,
  
  // Configuración
  ProviderLocationConfig,
  ServiceCoverage,
  
  // Búsqueda
  LocationFilters,
  LocationSearchResult,
  
  // Validación
  AddressValidation,
  ServiceCoverageValidation,
  
  // Utilidades
  Coordinates,
  DistanceInfo,
  CoverageZone,
} from './location';

// ===== RE-EXPORTACIONES DE COMPATIBILIDAD =====
// Mantener compatibilidad con tipos existentes en lib/types.ts

export type {
  // Desde lib/types.ts (los más usados)
  Achievement,
  AchievementLevel,
  AchievementLevelInfo,
  ProviderAchievements,
  ProviderProfile,
  User,
  DashboardStats,
  PriceHistory,
} from '../lib/types';