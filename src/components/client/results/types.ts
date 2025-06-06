
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
  aboutMe: string;
  experience: number;
  servicesCompleted: number;
  recurringClients: number;
  galleryImages: string[];
  hasCertifications: boolean;
  ratingCount: number;
  joinDate?: Date; // Added for provider level calculation
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
