import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  apartment?: string;
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
  
  // Flag para controlar el proceso de logout y evitar reautenticación
  const isLoggingOutRef = useRef(false);

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
      houseNumber: authUser.user_metadata?.house_number || '',
      apartment: authUser.user_metadata?.apartment || ''
    };
  };

  const updateUserPaymentMethod = (hasPayment: boolean) => {
    if (user) {
      // Para simplificar, solo actualizamos el estado local
      // En una implementación completa, esto actualizaría la base de datos
      console.log('Payment method updated:', hasPayment);
    }
  };

  // Función para limpiar completamente el localStorage de Supabase
  const clearSupabaseStorage = () => {
    try {
      console.log('AuthContext: Clearing Supabase storage');
      
      // Lista de patrones de claves que usa Supabase
      const supabasePatterns = [
        'supabase.auth.',
        'sb-',
        'supabase-auth-token',
        'supabase_auth_token',
        'sb-auth-token',
        'supabase.session',
        'sb-session'
      ];
      
      // Obtener todas las claves antes de eliminar
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const shouldRemove = supabasePatterns.some(pattern => key.includes(pattern));
          if (shouldRemove) {
            keysToRemove.push(key);
          }
        }
      }
      
      // Eliminar todas las claves identificadas
      keysToRemove.forEach(key => {
        console.log('AuthContext: Removing localStorage key:', key);
        localStorage.removeItem(key);
      });
      
      // También limpiar sessionStorage por si acaso
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const shouldRemove = supabasePatterns.some(pattern => key.includes(pattern));
          if (shouldRemove) {
            sessionKeysToRemove.push(key);
          }
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        console.log('AuthContext: Removing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      });
      
    } catch (error) {
      console.error('AuthContext: Error clearing storage:', error);
    }
  };

  useEffect(() => {
    console.log('AuthContext: Initializing authentication');
    
    // Configurar listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('AuthContext: Auth state changed -', event, !!currentSession, 'isLoggingOut:', isLoggingOutRef.current);
        
        // Si estamos en proceso de logout, ignorar todos los eventos
        if (isLoggingOutRef.current) {
          console.log('AuthContext: Ignoring auth event during logout process');
          return;
        }
        
        if (event === 'SIGNED_OUT' || !currentSession) {
          console.log('AuthContext: User signed out, clearing state');
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' && currentSession?.user) {
          console.log('AuthContext: Setting user from session');
          setSession(currentSession);
          setUser(createUserFromSession(currentSession.user));
        }
        
        setIsLoading(false);
      }
    );

    // Verificar sesión existente
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('AuthContext: Initial session check -', !!currentSession, 'isLoggingOut:', isLoggingOutRef.current);
      
      // Solo establecer sesión si no estamos en proceso de logout
      if (!isLoggingOutRef.current) {
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(createUserFromSession(currentSession.user));
        } else {
          setSession(null);
          setUser(null);
        }
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
      
      // Asegurar que no estamos en proceso de logout
      isLoggingOutRef.current = false;
      
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
    console.log('AuthContext: Starting logout process');
    
    try {
      // Establecer flag de logout para evitar reautenticación
      isLoggingOutRef.current = true;
      
      // Limpiar estado local inmediatamente
      setUser(null);
      setSession(null);
      setIsLoading(false);
      
      console.log('AuthContext: Cleared local state');
      
      // Limpiar storage antes del logout
      clearSupabaseStorage();
      
      // Cerrar sesión en Supabase con scope global para cerrar en todos los tabs
      console.log('AuthContext: Calling Supabase signOut');
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('AuthContext: Supabase logout error:', error);
      } else {
        console.log('AuthContext: Supabase logout successful');
      }
      
      // Limpiar storage nuevamente después del logout
      setTimeout(() => {
        clearSupabaseStorage();
      }, 100);
      
      // Pequeño delay antes de redirección para asegurar limpieza completa
      setTimeout(() => {
        console.log('AuthContext: Redirecting to landing page');
        // Usar replace para evitar que el usuario pueda volver atrás
        window.location.replace('/');
      }, 200);
      
    } catch (error) {
      console.error('AuthContext: Logout exception:', error);
      
      // Aún así, forzar limpieza completa
      isLoggingOutRef.current = true;
      setUser(null);
      setSession(null);
      setIsLoading(false);
      clearSupabaseStorage();
      
      // Redirección de emergencia
      setTimeout(() => {
        window.location.replace('/');
      }, 100);
    }
  };

  const isAuthenticated = !!session && !!user && !isLoggingOutRef.current;

  console.log('AuthContext: Current state -', { 
    isLoading, 
    isAuthenticated, 
    hasUser: !!user, 
    hasSession: !!session,
    userRole: user?.role,
    isLoggingOut: isLoggingOutRef.current
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
