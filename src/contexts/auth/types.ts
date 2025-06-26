
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'provider';
  avatarUrl?: string;
  phone?: string;
  condominiumName?: string;
  houseNumber?: string;
  apartment?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'provider';
  avatar_url?: string;
  condominium_name?: string;
  condominium_text?: string;
  house_number?: string;
  about_me?: string;
  experience_years?: number;
  certification_files?: any[];
  created_at?: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateUserPaymentMethod: (hasPayment: boolean) => void;
}
