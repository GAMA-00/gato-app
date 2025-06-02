
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
}

export interface Service {
  id: string;
  name: string;
  subcategoryId: string;
  category?: string; // Mantener category como opcional para compatibilidad
  duration: number;
  price: number;
  description: string;
  createdAt: Date;
  residenciaIds: string[];
  providerId: string;
  providerName: string;
  // Nuevos campos para el perfil del proveedor
  aboutMe?: string;
  profileImage?: File;
  galleryImages?: File[] | string[]; // Updated to allow both File[] and string[]
  experienceYears?: number;
  hasCertifications?: boolean;
  certificationFiles?: any[]; // Added certificationFiles field
  handlesDangerousDogs?: boolean;
  serviceVariants?: ServiceVariant[]; // Reemplaza serviceSizes con serviceVariants
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

export type UserRole = 'client' | 'provider' | 'admin';

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
  | 'rejected';

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
}

export interface BlockedTimeSlot {
  id: string;
  day: number;
  startHour: number;
  endHour: number;
  note?: string;
  isRecurring: boolean;
  recurrenceType?: 'weekly' | 'daily';
  createdAt: Date;
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
