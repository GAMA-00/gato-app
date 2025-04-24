
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

export interface Building {
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

// Renombrar interfaz de Building a Residencia para mayor coherencia
export interface Residencia {
  id: string;
  name: string;
  address: string;
}
