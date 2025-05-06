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

export interface ServiceDetailData {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration: number;
  provider: ProviderData;
  service_type: {
    name: string;
    category?: {
      name: string;
      label?: string;
    }
  };
  clientResidencia?: ClientResidencia;
  serviceVariants: ServiceVariant[];
  galleryImages: string[];
  recurringClients?: number;
  servicesCompleted?: number;
  createdAt?: string;
  updatedAt?: string;
}
