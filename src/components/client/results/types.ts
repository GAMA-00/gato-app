// Types for the client results view components

export interface ProcessedProvider {
  id: string;
  name: string;
  avatar?: string | null;
  rating: number;
  price: number;
  duration: number;
  serviceName: string;
  serviceId: string;
  aboutMe?: string;
  experience?: number;
  hasCertifications?: boolean;
  servicesCompleted?: number;
  recurringClients?: number; // New field for recurring clients
  experienceLevel?: number; // New field for experience level (1-4)
  isVerified?: boolean;
  ratingCount?: number; // New field to track number of reviews
  galleryImages?: string[]; // New field for gallery images
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
  id: string;
  name?: string;
  about_me?: string;
  experience_years?: number;
  average_rating?: number;
  servicesCompleted?: number; // New field for services completed
  hasCertifications?: boolean;
  certificationFiles?: any[]; // Array of certification file objects
  recurringClients?: number; // New field for recurring clients
  ratingCount?: number; // Number of ratings
  contactEmail?: string;
  contactPhone?: string;
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
