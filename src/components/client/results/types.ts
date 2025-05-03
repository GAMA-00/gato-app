
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
}
