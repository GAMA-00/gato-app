
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateUserPaymentMethod: (hasPayment: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Función para crear usuario desde datos de Supabase
  const createUserFromSession = (authUser: SupabaseUser): User => {
    const role = authUser.user_metadata?.role || 'client';
    
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
      email: authUser.email || '',
      role: role === 'provider' ? 'provider' : 'client',
      avatarUrl: authUser.user_metadata?.avatar_url || '',
      phone: authUser.user_metadata?.phone || '',
      condominiumName: authUser.user_metadata?.condominium_name || '',
      houseNumber: authUser.user_metadata?.house_number || ''
    };
  };

  const updateUserPaymentMethod = (hasPayment: boolean) => {
    if (user) {
      // Para simplificar, solo actualizamos el estado local
      // En una implementación completa, esto actualizaría la base de datos
      console.log('Payment method updated:', hasPayment);
    }
  };

  useEffect(() => {
    console.log('AuthContext: Initializing authentication');
    
    // Configurar listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('AuthContext: Auth state changed -', event, !!currentSession);
        
        if (currentSession?.user) {
          console.log('AuthContext: Setting user from session');
          setSession(currentSession);
          setUser(createUserFromSession(currentSession.user));
        } else {
          console.log('AuthContext: Clearing user session');
          setSession(null);
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // Verificar sesión existente
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('AuthContext: Initial session check -', !!currentSession);
      
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(createUserFromSession(currentSession.user));
      } else {
        setSession(null);
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => {
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
        console.log('AuthContext: Login successful');
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
      console.log('AuthContext: Attempting logout');
      setIsLoading(true);
      
      // Limpiar estado local primero
      setUser(null);
      setSession(null);
      
      // Intentar cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthContext: Logout error:', error);
        // Incluso si hay error, mantenemos el estado local limpio
      } else {
        console.log('AuthContext: Logout successful');
      }
      
      // Limpiar localStorage como medida adicional
      localStorage.removeItem('supabase.auth.token');
      
      // Forzar recarga de la página para limpiar completamente el estado
      window.location.href = '/login';
      
    } catch (error) {
      console.error('AuthContext: Logout exception:', error);
      // Incluso si hay excepción, limpiar estado y redirigir
      setUser(null);
      setSession(null);
      window.location.href = '/login';
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!session && !!user;

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
      updateUserPaymentMethod
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
