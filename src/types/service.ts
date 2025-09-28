/**
 * TIPOS CENTRALIZADOS PARA SERVICIOS
 * ==================================
 * 
 * Este archivo consolida todos los tipos relacionados con:
 * - Servicios y categorías
 * - Variables personalizadas 
 * - Variantes de servicio
 * - Configuración de servicios
 */

// ===== ENUMS Y TIPOS BASE =====

/** Categorías principales de servicios */
export type ServiceCategory = 
  | 'home'           // Hogar
  | 'personal-care'  // Cuidado personal
  | 'pets'           // Mascotas
  | 'sports'         // Deportes
  | 'classes'        // Clases
  | 'car-wash'       // Lavado de autos
  | 'gardening'      // Jardinería
  | 'cleaning'       // Limpieza
  | 'maintenance'    // Mantenimiento
  | 'other';         // Otros

// ===== INTERFACES DE VARIABLES PERSONALIZADAS =====

/**
 * Opción dentro de una variable personalizada
 * Ej: "Pequeño - $10", "Mediano - $15", etc.
 */
export interface CustomVariableOption {
  id: string;
  name: string;           // "Pequeño", "Con detergente especial"
  price: number;          // Precio adicional
  description?: string;   // Descripción opcional
}

/**
 * Variable personalizada completa
 * Ej: "Tamaño del auto", "Servicios adicionales"
 */
export interface CustomVariable {
  id: string;
  name: string;           // "Tamaño del vehículo"
  type: 'single' | 'multiple' | 'quantity'; // Tipo de selección
  isRequired: boolean;    // Si es obligatorio seleccionar
  options: CustomVariableOption[]; // Opciones disponibles
  
  // Para tipo 'quantity'
  pricePerUnit?: number;  // Precio por unidad
  minQuantity?: number;   // Cantidad mínima
  maxQuantity?: number;   // Cantidad máxima
}

/**
 * Grupo de variables personalizadas
 * Para organizar variables relacionadas
 */
export interface CustomVariableGroup {
  id: string;
  name: string;           // "Configuración del vehículo"
  description?: string;   // Descripción del grupo
  variables: CustomVariable[]; // Variables del grupo
}

// ===== INTERFACES DE VARIANTES =====

/**
 * Variante de servicio básica
 * Para diferentes opciones del mismo servicio
 */
export interface ServiceVariant {
  id?: string;
  name: string;           // "Básico", "Premium", "Deluxe"
  price: string | number; // Precio de la variante
  duration: string | number; // Duración en minutos
}

// ===== INTERFACES DE DISPONIBILIDAD =====

/**
 * Slot de tiempo específico
 * Para horarios de trabajo del proveedor
 */
export interface TimeSlot {
  startTime: string;      // "09:00"
  endTime: string;        // "17:00"
}

/**
 * Disponibilidad diaria
 * Configuración de un día específico
 */
export interface DayAvailability {
  enabled: boolean;       // Si trabaja este día
  timeSlots: TimeSlot[];  // Horarios de trabajo
}

/**
 * Disponibilidad semanal completa
 * Configuración de toda la semana
 */
export interface WeeklyAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
  
  // Permite acceso dinámico por clave
  [day: string]: DayAvailability;
}

// ===== INTERFACES PRINCIPALES DE SERVICIO =====

/**
 * Servicio completo (formulario de creación)
 * Toda la información necesaria para crear un servicio
 */
export interface Service {
  id: string;
  name: string;
  subcategoryId: string;
  category?: string;
  duration: number;       // Duración estándar en minutos
  price: number;          // Precio base
  description: string;
  createdAt: Date;
  residenciaIds: string[]; // Residencias donde se ofrece
  providerId: string;
  providerName: string;
  
  // Perfil del proveedor
  aboutMe?: string;
  profileImage?: File;
  galleryImages?: File[] | string[];
  experienceYears?: number;
  hasCertifications?: boolean;
  certificationFiles?: any[];
  handlesDangerousDogs?: boolean; // Para servicios de mascotas
  
  // Configuración del servicio
  serviceVariants?: ServiceVariant[];
  availability?: WeeklyAvailability;
  isPostPayment?: boolean; // Si se paga después del servicio
  slotSize?: number; // Tamaño de slot configurable (30 o 60 minutos)
  
  // Variables personalizadas
  customVariableGroups?: CustomVariableGroup[];
  useCustomVariables?: boolean;
}

/**
 * Información básica de categoría de servicio
 * Para mostrar en listas y menús
 */
export interface ServiceCategoryInfo {
  id: string;
  name: string;        // "cleaning"
  label: string;       // "Limpieza"
  icon: string;        // Ícono de Lucide
}

/**
 * Información básica de tipo de servicio
 * Para subcategorías dentro de una categoría
 */
export interface ServiceTypeInfo {
  id: string;
  name: string;        // "Limpieza de hogar"
  category_id: string; // ID de la categoría padre
  category?: ServiceCategoryInfo;
}

/**
 * Item de servicio simple
 * Para listas y selección rápida
 */
export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  duration?: number;
}

/**
 * Grupo de servicios por categoría  
 * Para organizar servicios en la UI
 */
export interface ServiceCategoryGroup {
  id: string;
  name: string;        // "Limpieza"
  services: {
    id: string;
    name: string;      // "Limpieza profunda"
    options: {
      id: string;
      size: string;    // "Casa pequeña"
      price: number;
      duration: number;
    }[];
  }[];
}

// ===== INTERFACES DE CONFIGURACIÓN =====

/**
 * Configuración de post-pago
 * Para servicios que se pagan después
 */
export interface PostPaymentConfig {
  enabled: boolean;
  requiresApproval: boolean;    // Si requiere aprobación del cliente
  maxAmount?: number;           // Monto máximo sin aprobación
  description?: string;         // Descripción del concepto
}

/**
 * Configuración de certificaciones
 * Para proveedores con certificaciones especiales
 */
export interface CertificationConfig {
  required: boolean;            // Si son obligatorias
  types: string[];             // Tipos de certificaciones aceptadas
  expirationRequired: boolean; // Si tienen fecha de vencimiento
}

// ===== TIPOS DE VALIDACIÓN =====

/**
 * Validación de servicio
 * Para verificar si un servicio está bien configurado
 */
export interface ServiceValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  missingFields?: string[];
}

/**
 * Validación de disponibilidad
 * Para verificar horarios de trabajo
 */
export interface AvailabilityValidation {
  isValid: boolean;
  hasOverlaps: boolean;
  gaps: string[];          // Horarios con espacios
  recommendations?: string[];
}

// ===== TIPOS DE FILTRADO Y BÚSQUEDA =====

/**
 * Filtros de búsqueda de servicios
 * Para filtrar servicios en resultados
 */
export interface ServiceFilters {
  category?: ServiceCategory;
  priceRange?: {
    min: number;
    max: number;
  };
  duration?: {
    min: number;          // Minutos
    max: number;
  };
  rating?: number;        // Calificación mínima
  availability?: {
    date: Date;
    timeSlot?: string;
  };
  location?: {
    residenciaId: string;
    maxDistance?: number; // En metros
  };
  features?: string[];    // Características especiales
}

/**
 * Resultado de búsqueda de servicios
 * Para mostrar resultados paginados
 */
export interface ServiceSearchResult {
  services: ServiceItem[];
  total: number;
  page: number;
  pageSize: number;
  filters: ServiceFilters;
  suggestions?: string[]; // Sugerencias de búsqueda
}

// ===== EXPORTACIONES PARA COMPATIBILIDAD =====

/** @deprecated Use ServiceCategoryInfo instead */
export interface ServiceCategory_Old {
  id: string;
  name: string;
  icon: string;
}

/** @deprecated Use ServiceTypeInfo instead */
export interface ServiceType_Old {
  id: string;
  name: string;
  categoryId: string;
}