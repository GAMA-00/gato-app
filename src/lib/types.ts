
export type ServiceCategory = 
  | 'cleaning'
  | 'pet-grooming'
  | 'car-wash'
  | 'gardening'
  | 'maintenance'
  | 'other';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  duration: number; // in minutes
  price: number;
  description: string;
  createdAt: Date;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: Date;
}

export interface Building {
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

export interface AppointmentStatus {
  id: string;
  name: string;
  color: string;
}

export interface Appointment {
  id: string;
  serviceId: string;
  clientId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  recurrence: RecurrencePattern;
  notes: string;
  createdAt: Date;
  building?: string;
  apartment?: string;
}

export interface BlockedTimeSlot {
  id: string;
  day: number; // 0-6 for Sunday-Saturday
  startHour: number; // 0-23
  endHour: number; // 0-23
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

export type AchievementLevel = 'beginner' | 'trusty' | 'recommended' | 'expert';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: string;
  completedAt?: Date;
  completionCount?: number; // Number of times the achievement has been completed
}

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
