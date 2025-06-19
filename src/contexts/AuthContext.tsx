
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

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
  const [isLoading, setIsLoading] = useState(true);

  const loadUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      console.log('Loading profile for user:', authUser.id);
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Profile loading error:', error);
        return null;
      }

      if (!profile) {
        console.error('No profile found');
        return null;
      }

      const userData: User = {
        id: authUser.id,
        name: profile.name || authUser.email?.split('@')[0] || 'Usuario',
        email: profile.email || authUser.email || '',
        phone: profile.phone || '',
        role: (profile.role === 'provider') ? 'provider' : 'client',
        avatarUrl: profile.avatar_url || '',
        residenciaId: profile.residencia_id || '',
        buildingName: profile.condominium_name || profile.condominium_text || '',
        hasPaymentMethod: profile.has_payment_method || false,
        condominiumId: profile.condominium_id || '',
        condominiumName: profile.condominium_name || profile.condominium_text || '',
        houseNumber: profile.house_number || '',
        apartment: '',
      };

      console.log('User profile loaded successfully:', userData);
      return userData;
    } catch (error) {
      console.error('Exception loading user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        if (session?.user && isMounted) {
          const userData = await loadUserProfile(session.user);
          if (isMounted) {
            setUser(userData);
          }
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, !!session);
        
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setIsLoading(true);
          const userData = await loadUserProfile(session.user);
          if (isMounted) {
            setUser(userData);
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      }
    );

    initializeAuth();

    return () => {
      console.log('Auth cleanup');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        console.log('Login successful');
        return { success: true };
      }

      return { success: false, error: 'Error de autenticación' };
    } catch (error) {
      console.error('Login exception:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUserPaymentMethod = (hasPaymentMethod: boolean) => {
    setUser(prev => prev ? { ...prev, hasPaymentMethod } : null);
  };

  const updateUserAvatar = (avatarUrl: string) => {
    setUser(prev => prev ? { ...prev, avatarUrl } : null);
  };

  const isAuthenticated = !!user;

  console.log('AuthProvider render - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user role:', user?.role);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated,
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
