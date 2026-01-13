
import { CurrencyCode } from '@/lib/types';

// Adding joinDate to ProcessedProvider interface
export interface ProcessedProvider {
  id: string;
  name: string;
  avatar: string | null;
  rating: number;
  price: number;
  duration: number;
  serviceName: string;
  serviceId: string;
  listingId: string; // Added for per-service recurring clients count
  aboutMe: string;
  serviceDescription?: string; // Added for showing service description in cards
  experience: number;
  servicesCompleted: number;
  recurringClients: number;
  galleryImages: string[];
  hasCertifications: boolean;
  ratingCount: number;
  joinDate?: Date; // Added for provider level calculation
  currency?: CurrencyCode; // Currency for price display
}

export interface ProviderData {
  id: string;
  name: string;
  avatar_url?: string;
  about_me?: string;
  experience_years?: number;
  certification_files?: any;
  average_rating?: number;
  created_at?: string; // Added for provider level calculation
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

export interface BookingPreferences {
  frequency?: string;
  selectedDays?: number[];
  timeSlot?: string;
  timePreference?: string;
}

export interface ServiceTypeData {
  id?: string;
  name?: string;
  category?: {
    id?: string;
    name?: string;
    label?: string;
  };
}
