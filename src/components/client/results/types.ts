
// Types for the client results view components

export interface ProcessedProvider {
  id: string;
  name: string;
  avatar: string | null;
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
  rating: number;
  experience: number;
  aboutMe: string;
  createdAt: string;
  isAvailable?: boolean;       // Campo para indicar disponibilidad
  category?: string;           // Categoría del servicio
  subcategory?: string;        // Subcategoría del servicio
  serviceImage?: string | null; // Image for the service
  hasCertifications?: boolean;  // Whether the provider has certifications
  recurringClients?: number;    // Number of recurring clients
}

export interface BookingPreferences {
  frequency?: string;
  selectedDays?: number[];
  timeSlot?: string;
  timePreference?: string;
  [key: string]: any;
}

// Interface for provider data returned from supabase
export interface ProviderData {
  id?: string;
  name?: string;
  about_me?: string;
  experience_years?: number;
  average_rating?: number;
  users?: any; // This could be an array or object
  email?: string;
  phone?: string;
  achievements?: Achievement[];
  servicesCompleted?: number;
  isVerified?: boolean;
  certifications?: boolean;
  hasCertifications?: boolean;
  certification_files?: any[];
  handlesDangerousDogs?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  level: string;
  points: number;
  description: string;
}

export interface ProviderReview {
  id: string;
  clientName: string;
  date: string;
  rating: number;
  comment: string;
}

export interface DetailedRatings {
  service: number;
  valueForMoney: number;
  friendliness: number;
  materials: number;
  professionalism: number;
  punctuality: number;
}

export interface ServiceOption {
  id: string;
  name: string;
  size: string;
  price: number;
  duration: number;
}
