import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Define the user types with different roles
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  residenciaId: string;  // Usando solo residenciaId como estándar
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

// Authentication context interface
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

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider for the context
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    console.log('🚀 ==> AuthContext - INICIALIZANDO');
    console.log('🚀 Supabase URL:', supabase.supabaseUrl);
    console.log('🚀 Timestamp de inicialización:', new Date().toISOString());
    
    let mounted = true;
    
    // Set loading timeout as safety net
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.log('🚀 TIMEOUT DE LOADING ALCANZADO - forzando isLoading a false');
        setIsLoading(false);
      }
    }, 3000); // Reducido a 3 segundos para debugging

    const initializeAuth = async () => {
      try {
        console.log('🚀 Obteniendo sesión inicial...');
        
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        console.log('🚀 Resultado de getSession:', {
          tieneSession: !!initialSession,
          tieneUser: !!initialSession?.user,
          error: error?.message,
          sessionId: initialSession?.access_token?.substring(0, 20) || 'NO_TOKEN'
        });
        
        if (!mounted) {
          console.log('🚀 Componente desmontado, saliendo de initializeAuth');
          return;
        }
        
        if (error) {
          console.error('🚀 ERROR obteniendo sesión inicial:', error);
          setIsLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }

        if (initialSession?.user) {
          console.log('🚀 Sesión inicial encontrada, cargando perfil...');
          await loadUserProfile(initialSession.user);
          setSession(initialSession);
        } else {
          console.log('🚀 No hay sesión inicial, verificando localStorage...');
          // No session, try localStorage as fallback
          const storedUser = localStorage.getItem('gato_user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              console.log('🚀 Usuario encontrado en localStorage:', {
                id: parsedUser.id,
                email: parsedUser.email,
                role: parsedUser.role
              });
              setUser(parsedUser);
            } catch (error) {
              console.error('🚀 Error parseando usuario de localStorage:', error);
              localStorage.removeItem('gato_user');
            }
          } else {
            console.log('🚀 No hay usuario en localStorage');
          }
        }
        
        // Always set loading to false after initial check
        console.log('🚀 Estableciendo isLoading a false después de verificación inicial');
        setIsLoading(false);
        clearTimeout(loadingTimeout);
        
      } catch (error) {
        console.error('🚀 ERROR en initializeAuth:', error);
        if (mounted) {
          setIsLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    // Set up auth state listener
    console.log('🚀 Configurando listener de cambios de auth...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🚀 CAMBIO DE ESTADO DE AUTH:', {
          event,
          tieneSession: !!session,
          tieneUser: !!session?.user,
          timestamp: new Date().toISOString(),
          sessionId: session?.access_token?.substring(0, 20) || 'NO_TOKEN'
        });
        
        if (!mounted) {
          console.log('🚀 Componente desmontado, ignorando cambio de auth');
          return;
        }
        
        setSession(session);
        
        if (session?.user && event !== 'SIGNED_OUT') {
          console.log('🚀 Sesión activa detectada, cargando perfil...');
          await loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚀 Usuario desconectado, limpiando datos...');
          setUser(null);
          localStorage.removeItem('gato_user');
        }
        
        // Ensure loading is false after any auth state change
        console.log('🚀 Estableciendo isLoading a false después de cambio de auth');
        setIsLoading(false);
      }
    );

    // Initialize auth
    console.log('🚀 Ejecutando initializeAuth...');
    initializeAuth();

    return () => {
      console.log('🚀 Limpiando AuthContext...');
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('🚀 Cargando perfil de usuario para ID:', supabaseUser.id);
      console.log('🚀 Email del usuario de Supabase:', supabaseUser.email);
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      console.log('🚀 Resultado de loadUserProfile:', {
        tieneProfile: !!profile,
        error: error?.message,
        errorCode: error?.code,
        profileRole: profile?.role,
        profileEmail: profile?.email
      });

      if (error) {
        console.error('🚀 ERROR cargando perfil de usuario:', error);
        return;
      }

      if (profile) {
        const userData: User = {
          id: profile.id,
          name: profile.name || supabaseUser.user_metadata?.name || '',
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

        console.log('🚀 Perfil de usuario cargado exitosamente:', {
          id: userData.id,
          email: userData.email,
          role: userData.role,
          name: userData.name
        });
        setUser(userData);
        localStorage.setItem('gato_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('🚀 EXCEPCIÓN cargando perfil de usuario:', error);
    }
  };

  // Login function
  const login = (userData: User) => {
    console.log('🚀 AuthContext.login llamado con:', {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      name: userData.name
    });
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
    setIsLoading(false);
    console.log('🚀 AuthContext.login completado');
  };

  // Register function
  const register = (userData: User) => {
    console.log('🚀 AuthContext.register llamado con:', {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      name: userData.name
    });
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
    setIsLoading(false);
    console.log('🚀 AuthContext.register completado');
  };

  // Logout function
  const logout = async () => {
    console.log('🚀 AuthContext.logout llamado');
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      localStorage.removeItem('gato_user');
    } catch (error) {
      console.error('🚀 ERROR durante logout:', error);
      // Clear local state even if Supabase call fails
      setUser(null);
      setSession(null);
      localStorage.removeItem('gato_user');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update user payment method
  const updateUserPaymentMethod = (hasPaymentMethod: boolean) => {
    if (user) {
      const updatedUser = { ...user, hasPaymentMethod };
      console.log('🚀 AuthContext - Update Payment Method ===', updatedUser);
      setUser(updatedUser);
      localStorage.setItem('gato_user', JSON.stringify(updatedUser));
    }
  };

  const updateUserAvatar = (avatarUrl: string) => {
    console.log('🚀 AuthContext - Update Avatar ===', avatarUrl);
    
    if (user) {
      const updatedUser = { ...user, avatarUrl };
      console.log('Updated user with new avatar:', updatedUser);
      setUser(updatedUser);
      localStorage.setItem('gato_user', JSON.stringify(updatedUser));
    }
  };

  // Check if the user is a client, provider, or admin
  const isClient = user?.role === 'client';
  const isProvider = user?.role === 'provider';
  const isAdmin = user?.role === 'admin';

  console.log('🚀 AuthContext render - Estado actual:', {
    tieneUser: !!user,
    userRole: user?.role,
    isAuthenticated: !!user && !!session,
    isLoading,
    tieneSession: !!session
  });

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

// Hook to use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
