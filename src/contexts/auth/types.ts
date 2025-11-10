
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'client' | 'provider' | 'admin';
  phone?: string;
  avatar_url?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  about_me?: string;
  experience_years?: number;
  role: 'client' | 'provider' | 'admin';
  residencia_id?: string;
  condominium_id?: string;
  condominium_name?: string;
  condominium_text?: string;
  house_number?: string;
  address?: string; // Billing address persisted from checkout
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateUserPaymentMethod: (hasPayment: boolean) => void;
  isLoggingOut: boolean; // Nuevo campo para exponer el estado de logout
}
