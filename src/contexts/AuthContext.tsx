
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  residenciaId: string;
  buildingName: string;
  hasPaymentMethod: boolean;
  role: 'client' | 'provider' | 'admin';
  avatarUrl?: string;
  apartment?: string;
  houseNumber?: string;
  condominiumId?: string; 
  condominiumName?: string;
  offerBuildings?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  register: (user: User) => void;
  logout: () => void;
  updateUserPaymentMethod: (hasPaymentMethod: boolean) => void;
  updateUserAvatar: (avatarUrl: string) => void;
  isLoading: boolean;
  isClient: boolean;
  isProvider: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    console.log('Inicializando contexto de autenticación');
    
    let mounted = true;
    
    // Configurar listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Cambio de estado de auth:', event, !!session);
        setSession(session);
        
        if (session?.user && event !== 'SIGNED_OUT') {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          localStorage.removeItem('gato_user');
        }
        
        setIsLoading(false);
      }
    );

    // Verificar sesión existente
    const checkSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          setSession(initialSession);
          await loadUserProfile(initialSession.user);
        } else {
          // Verificar localStorage como respaldo
          const storedUser = localStorage.getItem('gato_user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
            } catch (error) {
              localStorage.removeItem('gato_user');
            }
          }
        }
        
        setIsLoading(false);
        
      } catch (error) {
        console.error('Error verificando sesión:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error cargando perfil:', error);
        return;
      }

      if (profile) {
        const userData: User = {
          id: profile.id,
          name: profile.name || '',
          email: profile.email || supabaseUser.email || '',
          phone: profile.phone || '',
          residenciaId: profile.residencia_id || '',
          buildingName: '',
          hasPaymentMethod: profile.has_payment_method || false,
          role: profile.role as 'client' | 'provider' | 'admin',
          avatarUrl: profile.avatar_url || '',
          apartment: profile.house_number || '',
          houseNumber: profile.house_number || '',
          condominiumId: profile.condominium_id || '',
          condominiumName: profile.condominium_name || '',
        };

        setUser(userData);
        localStorage.setItem('gato_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Excepción cargando perfil:', error);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
  };

  const register = (userData: User) => {
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      localStorage.removeItem('gato_user');
    } catch (error) {
      console.error('Error durante logout:', error);
      setUser(null);
      setSession(null);
      localStorage.removeItem('gato_user');
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUserPaymentMethod = (hasPaymentMethod: boolean) => {
    if (user) {
      const updatedUser = { ...user, hasPaymentMethod };
      setUser(updatedUser);
      localStorage.setItem('gato_user', JSON.stringify(updatedUser));
    }
  };

  const updateUserAvatar = (avatarUrl: string) => {
    if (user) {
      const updatedUser = { ...user, avatarUrl };
      setUser(updatedUser);
      localStorage.setItem('gato_user', JSON.stringify(updatedUser));
    }
  };

  const isClient = user?.role === 'client';
  const isProvider = user?.role === 'provider';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user && !!session, 
      login, 
      register, 
      logout,
      updateUserPaymentMethod,
      updateUserAvatar,
      isLoading,
      isClient,
      isProvider,
      isAdmin
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
