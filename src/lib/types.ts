
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
}

export interface DashboardStats {
  todayAppointments: number;
  weekAppointments: number;
  monthRevenue: number;
  activeClients: number;
}
