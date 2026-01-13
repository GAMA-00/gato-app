
import { CurrencyCode } from '@/lib/types';

export interface ClientResidencia {
  id?: string;
  name: string;
  address?: string;
}

export interface ServiceDetailData {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration: number;
  provider_id: string;
  service_type_id: string;
  is_active: boolean;
  is_post_payment: boolean;
  currency?: CurrencyCode;
  gallery_images?: string[];
  galleryImages?: string[];
  service_type?: {
    id?: string;
    name?: string;
    category?: {
      id?: string;
      name?: string;
      label?: string;
    }
  };
  provider: ProviderData;
  serviceVariants?: ServiceVariant[];
  clientResidencia?: ClientResidencia;
  recurringClients?: number;
}

export interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  duration: number;
  additionalPersonPrice?: number; // Precio por persona adicional (opcional)
  maxPersons?: number; // Máximo de personas permitido (opcional)
}

export interface CertificationFile {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface ProviderData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  about_me?: string;
  avatar_url?: string;
  experience_years?: number;
  average_rating?: number;
  certification_files?: any[];
  certificationFiles?: CertificationFile[];
  hasCertifications?: boolean;
  servicesCompleted?: number;
  role?: string;
  created_at?: string; // Added for provider level calculation
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
