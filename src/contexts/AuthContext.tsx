
import React, { createContext, useContext, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'client' | 'provider';
  avatarUrl?: string;
  residenciaId: string;
  buildingName: string;
  hasPaymentMethod: boolean;
  condominiumId: string;
  condominiumName: string;
  houseNumber: string;
  apartment?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateUserPaymentMethod: (hasPaymentMethod: boolean) => void;
  updateUserAvatar: (avatarUrl: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    console.log('=== STARTING LOGIN ===');
    console.log('Email:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('Login error:', error);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('Auth user:', data.user.id);
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          setIsLoading(false);
          return { success: false, error: 'Error al cargar perfil' };
        }

        console.log('User profile:', profile);

        const userData: User = {
          id: data.user.id,
          name: profile?.name || data.user.email?.split('@')[0] || 'Usuario',
          email: profile?.email || data.user.email || '',
          phone: profile?.phone || '',
          role: (profile?.role === 'provider') ? 'provider' : 'client',
          avatarUrl: profile?.avatar_url || '',
          residenciaId: profile?.residencia_id || '',
          buildingName: profile?.condominium_name || profile?.condominium_text || '',
          hasPaymentMethod: profile?.has_payment_method || false,
          condominiumId: profile?.condominium_id || '',
          condominiumName: profile?.condominium_name || profile?.condominium_text || '',
          houseNumber: profile?.house_number || '',
          apartment: '',
        };
        
        console.log('Setting user data:', userData);
        setUser(userData);
        setIsLoading(false);
        return { success: true };
      }
    } catch (error) {
      console.error('Login exception:', error);
      setIsLoading(false);
      return { success: false, error: 'Error de conexión' };
    }

    setIsLoading(false);
    return { success: false, error: 'Error desconocido' };
  };

  const logout = async () => {
    console.log('=== LOGGING OUT ===');
    try {
      await supabase.auth.signOut();
      setUser(null);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  const updateUserPaymentMethod = (hasPaymentMethod: boolean) => {
    if (user) {
      setUser({ ...user, hasPaymentMethod });
    }
  };

  const updateUserAvatar = (avatarUrl: string) => {
    if (user) {
      setUser({ ...user, avatarUrl });
    }
  };

  console.log('AuthProvider render - user:', user?.id, 'isAuthenticated:', !!user);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login,
      logout,
      isLoading,
      updateUserPaymentMethod,
      updateUserAvatar
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
