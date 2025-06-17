
import React, { createContext, useContext, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'client' | 'provider';
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const userData: User = {
          id: data.user.id,
          name: profile?.name || data.user.email?.split('@')[0] || 'Usuario',
          email: profile?.email || data.user.email || '',
          phone: profile?.phone || '',
          role: (profile?.role === 'provider') ? 'provider' : 'client',
          avatarUrl: profile?.avatar_url || '',
        };
        
        setUser(userData);
        setIsLoading(false);
        return { success: true };
      }
    } catch (error) {
      setIsLoading(false);
      return { success: false, error: 'Error de conexión' };
    }

    setIsLoading(false);
    return { success: false, error: 'Error desconocido' };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login,
      logout,
      isLoading
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
