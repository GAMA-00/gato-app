/**
 * TIPOS CENTRALIZADOS PARA UBICACIONES
 * ====================================
 * 
 * Este archivo consolida todos los tipos relacionados con:
 * - Residencias y condominios
 * - Direcciones y ubicaciones
 * - Información geográfica
 */

// ===== INTERFACES PRINCIPALES =====

/**
 * Residencia completa
 * Complejo habitacional o edificio principal
 */
export interface Residencia {
  id: string;
  name: string;           // "Torres del Parque"
  address: string;        // Dirección completa
  created_at?: string;
  
  // Información adicional
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  
  // Coordenadas geográficas
  latitude?: number;
  longitude?: number;
  
  // Información de contacto
  phone?: string;
  email?: string;
  website?: string;
  
  // Metadatos
  isActive?: boolean;
  totalUnits?: number;    // Número total de unidades
  buildingType?: 'residential' | 'commercial' | 'mixed';
}

/**
 * Condominio dentro de una residencia
 * Edificio o sección específica dentro del complejo
 */
export interface Condominium {
  id: string;
  name: string;           // "Torre A", "Edificio Norte"
  residencia_id: string;  // ID de la residencia padre
  created_at?: string;
  
  // Información específica del condominio
  floors?: number;
  unitsPerFloor?: number;
  buildingNumber?: string;
  
  // Referencia a la residencia padre
  residencia?: Residencia;
}

/**
 * Información de residencia para clientes
 * Versión simplificada para mostrar en formularios
 */
export interface ClientResidencia {
  id?: string;
  name: string;
  address?: string;
  
  // Información de ubicación del cliente
  condominium?: string;   // Nombre del condominio
  condominiumId?: string; // ID del condominio
  houseNumber?: string;   // Número de casa/apartamento
  apartment?: string;     // Apartamento específico
}

/**
 * Dirección completa construida
 * Para mostrar direcciones formateadas al usuario
 */
export interface FormattedAddress {
  full: string;           // Dirección completa formateada
  residencia: string;     // Nombre de la residencia
  condominium?: string;   // Nombre del condominio (si aplica)
  unit?: string;          // Número de casa/apartamento
  
  // Componentes separados
  building?: string;      // "Torre A"
  floor?: string;         // "Piso 3"
  apartment?: string;     // "Apto 301"
}

// ===== INTERFACES DE CONFIGURACIÓN =====

/**
 * Configuración de ubicación para proveedores
 * Residencias donde el proveedor ofrece servicios
 */
export interface ProviderLocationConfig {
  providerId: string;
  residencias: string[];  // IDs de residencias donde trabaja
  maxDistance?: number;   // Distancia máxima en metros
  travelFee?: number;     // Tarifa por desplazamiento
  
  // Restricciones
  excludedAreas?: string[]; // Áreas excluidas
  preferredAreas?: string[]; // Áreas preferidas
  workingRadius?: number;   // Radio de trabajo en metros
}

/**
 * Información de cobertura de servicio
 * Para mostrar dónde está disponible un servicio
 */
export interface ServiceCoverage {
  residencias: {
    id: string;
    name: string;
    isAvailable: boolean;
    estimatedTime?: number;   // Tiempo estimado de llegada en minutos
    additionalFee?: number;   // Tarifa adicional si aplica
  }[];
  
  // Información general
  totalCoverage: number;      // Porcentaje de cobertura
  averageResponseTime: number; // Tiempo promedio de respuesta
}

// ===== INTERFACES DE BÚSQUEDA =====

/**
 * Filtros de ubicación para búsqueda
 * Para buscar servicios por ubicación
 */
export interface LocationFilters {
  residenciaId?: string;
  condominiumId?: string;
  maxDistance?: number;     // En metros
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // Filtros adicionales
  includeNearby?: boolean;  // Incluir residencias cercanas
  preferredOnly?: boolean;  // Solo áreas preferidas del proveedor
}

/**
 * Resultado de búsqueda por ubicación
 * Servicios disponibles en una ubicación específica
 */
export interface LocationSearchResult {
  residencia: Residencia;
  availableServices: number;
  avgResponseTime: number;  // En minutos
  providers: {
    id: string;
    name: string;
    services: string[];
    distance?: number;      // En metros
  }[];
}

// ===== INTERFACES DE VALIDACIÓN =====

/**
 * Validación de dirección
 * Para verificar si una dirección es válida y completa
 */
export interface AddressValidation {
  isValid: boolean;
  isComplete: boolean;
  errors: string[];
  suggestions?: string[];
  
  // Información detectada
  detectedResidencia?: string;
  detectedCondominium?: string;
  confidence: number;      // Nivel de confianza (0-100)
}

/**
 * Validación de cobertura de servicio
 * Para verificar si un servicio está disponible en una ubicación
 */
export interface ServiceCoverageValidation {
  isAvailable: boolean;
  reason?: string;         // Razón si no está disponible
  alternatives?: {
    residenciaId: string;
    name: string;
    distance: number;      // En metros
  }[];
  
  // Información de disponibilidad
  estimatedArrival?: number; // En minutos
  additionalCost?: number;   // Costo adicional
}

// ===== TIPOS DE UTILIDAD =====

/**
 * Coordenadas geográficas
 * Para ubicaciones con GPS
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;       // Precisión en metros
  timestamp?: Date;        // Cuándo se obtuvo la ubicación
}

/**
 * Información de distancia
 * Para cálculos de proximidad
 */
export interface DistanceInfo {
  meters: number;
  kilometers: number;
  estimatedTime: number;   // En minutos
  mode: 'walking' | 'driving' | 'transit';
}

/**
 * Zona de cobertura
 * Para definir áreas de servicio
 */
export interface CoverageZone {
  id: string;
  name: string;            // "Zona Norte", "Centro"
  description?: string;
  
  // Definición geográfica
  boundaries?: Coordinates[]; // Polígono de la zona
  center?: Coordinates;       // Centro de la zona
  radius?: number;            // Radio en metros (si es circular)
  
  // Configuración de servicio
  isActive: boolean;
  priority: number;           // Prioridad (1 = mayor)
  serviceFee?: number;        // Tarifa adicional
}

// ===== EXPORTACIONES PARA COMPATIBILIDAD =====

/** @deprecated Use Residencia instead */
export interface Building extends Residencia {
  buildingName?: string;
}

/** @deprecated Use FormattedAddress instead */
export interface Address {
  street: string;
  building: string;
  apartment: string;
  city: string;
  postalCode: string;
}