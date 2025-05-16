
export interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export interface ClientResidencia {
  name: string;
  address: string;
}

export interface CertificationFile {
  name?: string;
  url: string;
  type: string;
  size?: number;
}

export interface ServiceTypeData {
  name: string;
  category?: {
    name: string;
    label?: string;
  }
}

// Update this interface to match the one in results/types.ts
export interface ProviderData {
  id: string; // Make sure this is required in both interfaces
  name?: string;
  about_me?: string;
  experience_years?: number;
  average_rating?: number;
  users?: any; // This could be an array or object
  email?: string;
  phone?: string;
  certificationFiles?: CertificationFile[];
  hasCertifications?: boolean;
  created_at?: string;
  servicesCompleted?: number;
  isVerified?: boolean;
  certification_files?: any; // Add this to match database field
  ratingCount?: number; // Add the missing ratingCount field
}

export interface ServiceDetailData {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration: number;
  provider: ProviderData;
  service_type: ServiceTypeData;
  clientResidencia?: ClientResidencia;
  serviceVariants: ServiceVariant[];
  galleryImages: string[];
  recurringClients?: number;
  servicesCompleted?: number;
  createdAt?: string;
  updatedAt?: string;
}
