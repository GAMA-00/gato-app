export type ServiceCategory = 
  | 'home'
  | 'personal-care'
  | 'pets'
  | 'sports'
  | 'classes'
  | 'car-wash'
  | 'gardening'
  | 'cleaning'
  | 'maintenance'
  | 'other';

export interface ServiceVariant {
  id?: string;
  name: string;
  price: string | number;
  duration: string | number;
  customVariables?: CustomVariable[];
  additionalPersonPrice?: string | number; // Precio por persona adicional
  maxPersons?: string | number; // Máximo de personas (opcional)
}

// Nuevas interfaces para variables personalizadas flexibles
export interface CustomVariableOption {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface CustomVariable {
  id: string;
  name: string;
  type: 'single' | 'multiple' | 'quantity' | 'price' | 'min_max';
  isRequired: boolean;
  options: CustomVariableOption[];
  pricePerUnit?: number; // Para tipo 'quantity' y 'min_max'
  minQuantity?: number;
  maxQuantity?: number;
  basePrice?: number; // Para tipo 'price'
  priceIncrement?: number; // Para tipo 'price'
  minValue?: number; // Para tipo 'min_max'
  maxValue?: number; // Para tipo 'min_max'
}

export interface CustomVariableGroup {
  id: string;
  name: string;
  description?: string;
  variables: CustomVariable[];
}

// Nueva interfaz para disponibilidad
export interface WeeklyAvailability {
  [day: string]: {
    enabled: boolean;
    timeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
}

export interface Service {
  id: string;
  name: string;
  subcategoryId: string;
  category?: string;
  duration: number;
  price: number;
  description: string;
  createdAt: Date;
  residenciaIds: string[];
  providerId: string;
  providerName: string;
  // Campos para el perfil del proveedor
  aboutMe?: string;
  profileImage?: File;
  galleryImages?: File[] | string[];
  experienceYears?: number;
  hasCertifications?: boolean;
  certificationFiles?: any[];
  handlesDangerousDogs?: boolean;
  serviceVariants?: ServiceVariant[];
  // Nueva disponibilidad semanal
  availability?: WeeklyAvailability;
  // Preferencias permanentes de slots (day-time -> enabled) y configuraciones adicionales
  slotPreferences?: {
    minNoticeHours?: number;
    serviceRequirements?: string;
    [key: string]: any;
  };
  // Nuevo campo para servicios post-pago - ahora puede ser boolean o "ambas"
  isPostPayment?: boolean | "ambas";
  // Tamaño de slot configurable (30 o 60 minutos)
  slotSize?: number;
  // Nuevos campos para variables personalizadas flexibles
  customVariableGroups?: CustomVariableGroup[];
  useCustomVariables?: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: Date;
  isRecurring: boolean;
  preferredProviders: string[];
  totalBookings: number;
}

export interface Residencia {
  id: string;
  name: string;
  address: string;
}

export type UserRole = 'client' | 'provider';

export type RecurrencePattern = 
  | 'none'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly';

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'rescheduled';

export interface AppointmentStatus {
  id: string;
  name: string;
  color: string;
}

export interface Appointment {
  id: string;
  serviceId: string;
  clientId: string;
  providerId: string;
  startTime: Date;
  endTime: Date;
  status: OrderStatus;
  recurrence: RecurrencePattern;
  notes: string;
  createdAt: Date;
  residencia?: string;
  apartment?: string;
  serviceName?: string;
  clientName?: string;
  providerName?: string;
  adminNotes?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
  // Nuevos campos para pagos post-servicio
  finalPrice?: number;
  stripePaymentIntentId?: string;
}


export interface DashboardStats {
  todayAppointments: number;
  weekAppointments: number;
  monthRevenue: number;
  activeClients: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  completedAt: Date | null;
  completionCount?: number;
}

export type AchievementLevel = 'beginner' | 'trusty' | 'recommended' | 'expert';

export interface AchievementLevelInfo {
  level: AchievementLevel;
  name: string;
  description: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  icon: string;
}

export interface ProviderAchievements {
  totalPoints: number;
  currentLevel: AchievementLevel;
  nextLevel: AchievementLevel | null;
  pointsToNextLevel: number;
  achievements: Achievement[];
}

export interface ProviderProfile {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  ratingCount: number;
  aboutMe: string;
  galleryImages: string[];
  experienceYears: number;
  hasCertifications: boolean;
  certificationFiles?: any[]; // Added certificationFiles field
  handlesDangerousDogs: boolean;
  servicesCompleted: number;
  isVerified: boolean;
  joinDate: Date;
  detailedRatings: {
    service: number;
    valueForMoney: number;
    friendliness: number;
    materials: number;
    professionalism: number;
    punctuality: number;
  };
  reviews: {
    id: string;
    clientName: string;
    date: Date;
    rating: number;
    comment: string;
  }[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  residenciaId: string;
  buildingName: string;
  hasPaymentMethod: boolean;
  role: UserRole;
  avatarUrl: string;
  condominiumId: string;
  condominiumName: string;
  houseNumber: string;
  apartment?: string;
}

export interface ServiceCategoryGroup {
  id: string;
  name: string;
  services: {
    id: string;
    name: string;
    options: {
      id: string;
      size: string;
      price: number;
      duration: number;
    }[];
  }[];
}

// Nueva interfaz para historial de precios
export interface PriceHistory {
  id: string;
  providerId: string;
  clientId: string;
  listingId: string;
  amount: number;
  appointmentId: string;
  createdAt: Date;
}
