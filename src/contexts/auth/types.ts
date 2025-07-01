
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'client' | 'provider';
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
  role: 'client' | 'provider';
  residencia_id?: string;
  condominium_name?: string;
  house_number?: string;
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
