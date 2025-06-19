
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'provider';
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
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Función simple para crear usuario desde datos de Supabase
  const createUserFromSession = (authUser: SupabaseUser): User => {
    const role = authUser.user_metadata?.role || 'client';
    
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
      email: authUser.email || '',
      role: role === 'provider' ? 'provider' : 'client'
    };
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
      console.log('AuthContext: Logging out');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
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
