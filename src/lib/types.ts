
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
  category: ServiceCategory;
  duration: number; // in minutes
  price: number;
  description: string;
  createdAt: Date;
  buildingIds: string[]; // Available buildings
  providerId: string; // ID of the provider who created this service
  providerName: string; // Name of the provider
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: Date;
  isRecurring: boolean; // Flag to identify recurring clients
  preferredProviders: string[]; // IDs of preferred providers
  totalBookings: number; // Count of total bookings made
}

export interface Building {
  id: string;
  name: string;
  address: string;
}

export type UserRole = 'client' | 'provider' | 'admin'; // Added admin role

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
  building?: string;
  apartment?: string;
  serviceName?: string;
  clientName?: string;
  adminNotes?: string; // Notes added by admin
  lastModifiedBy?: string; // ID of the last user who modified this
  lastModifiedAt?: Date; // When the appointment was last modified
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
  pendingOrders: number; // Added for admin dashboard
  totalProviders: number; // Added for admin dashboard
  recurringClients: number; // Added for admin dashboard
  occasionalClients: number; // Added for admin dashboard
}

export interface AdminStats {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
  totalClients: number;
  recurringClients: number;
  occasionalClients: number;
  totalProviders: number;
  activeProviders: number;
}

export interface Provider {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: ServiceCategory[];
  rating: number;
  totalBookings: number;
  activeBookings: number;
  isActive: boolean;
  buildings: string[]; // Buildings where provider offers services
  joinedAt: Date;
  profileImage?: string;
}

export interface ClientProviderRelation {
  clientId: string;
  providerId: string;
  bookingCount: number;
  lastBookingDate: Date;
  isPreferred: boolean;
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

export interface CategoryOption {
  id: ServiceCategory;
  name: string;
  icon: React.ReactNode;
  services: string[];
}
