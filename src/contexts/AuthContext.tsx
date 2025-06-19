
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
  const [session, setSession] = useState<Session | null>(null);

  const loadUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
    try {
      console.log('AuthContext: Loading profile for user:', authUser.id);
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('AuthContext: Profile loading error:', error);
        return null;
      }

      if (!profile) {
        console.error('AuthContext: No profile found');
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

      console.log('AuthContext: User profile loaded successfully:', userData);
      return userData;
    } catch (error) {
      console.error('AuthContext: Exception loading user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let authTimeout: NodeJS.Timeout;
    
    console.log('AuthContext: Starting initialization');

    // Timeout de seguridad para evitar loops infinitos
    authTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('AuthContext: Auth initialization timeout, forcing completion');
        setIsLoading(false);
      }
    }, 5000); // 5 segundos timeout

    // Solo usar onAuthStateChange para manejar todos los casos
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed -', event, !!session);
        
        if (!mounted) return;

        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            console.log('AuthContext: Initial session found, loading profile');
            setSession(session);
            const userData = await loadUserProfile(session.user);
            if (mounted) {
              setUser(userData);
              setIsLoading(false);
              clearTimeout(authTimeout);
            }
          } else {
            console.log('AuthContext: No initial session');
            if (mounted) {
              setSession(null);
              setUser(null);
              setIsLoading(false);
              clearTimeout(authTimeout);
            }
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthContext: User signed in, loading profile');
          setSession(session);
          const userData = await loadUserProfile(session.user);
          if (mounted) {
            setUser(userData);
            setIsLoading(false);
            clearTimeout(authTimeout);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthContext: User signed out');
          if (mounted) {
            setSession(null);
            setUser(null);
            setIsLoading(false);
            clearTimeout(authTimeout);
          }
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('AuthContext: Token refreshed');
          if (mounted) {
            setSession(session);
            // No recargar perfil en refresh de token
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('AuthContext: Login error:', error);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        console.log('AuthContext: Login successful, session established');
        // El listener onAuthStateChange manejará la actualización del estado
        return { success: true };
      }

      return { success: false, error: 'Error de autenticación' };
    } catch (error) {
      console.error('AuthContext: Login exception:', error);
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Logging out');
      await supabase.auth.signOut();
      // El listener onAuthStateChange manejará la limpieza del estado
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
    }
  };

  const updateUserPaymentMethod = (hasPaymentMethod: boolean) => {
    setUser(prev => prev ? { ...prev, hasPaymentMethod } : null);
  };

  const updateUserAvatar = (avatarUrl: string) => {
    setUser(prev => prev ? { ...prev, avatarUrl } : null);
  };

  const isAuthenticated = !!user && !!session;

  console.log('AuthContext: Current state -', { 
    isLoading, 
    isAuthenticated, 
    hasUser: !!user, 
    hasSession: !!session,
    userRole: user?.role 
  });

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
