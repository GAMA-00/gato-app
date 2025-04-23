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
}
