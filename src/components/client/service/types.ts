
import { ProviderData } from '@/components/client/results/types';

export interface ServiceTypeData {
  name: string;
  category?: {
    name: string;
  };
}

export interface ClientResidencia {
  name: string;
  address: string;
}

export interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export interface ServiceDetailData {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration: number;
  is_active: boolean;
  provider: ProviderData;
  service_type: ServiceTypeData;
  clientResidencia?: ClientResidencia | null;
  recurringClients?: number;
  serviceVariants?: ServiceVariant[];
  galleryImages?: string[];
  servicesCompleted?: number;
}
