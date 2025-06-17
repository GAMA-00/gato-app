
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

  useEffect(() => {
    console.log('AuthProvider: Initializing...');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('AuthProvider: Initial session check', { session, error });
        
        if (error) {
          console.error('AuthProvider: Error getting session:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('AuthProvider: Found existing session, loading profile...');
          await loadUserProfile(session.user);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('AuthProvider: Exception getting session:', error);
        setIsLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed', { event, session });
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('AuthProvider: User signed out or no session');
          setUser(null);
          localStorage.removeItem('gato_user');
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in, loading profile...');
          await loadUserProfile(session.user);
        }
      }
    );

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('AuthProvider: Loading profile for user:', supabaseUser.id);
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      console.log('AuthProvider: Profile query result', { profile, error });

      if (error) {
        console.error('AuthProvider: Error loading profile:', error);
        // If profile doesn't exist, create a basic user object
        const basicUser: User = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || '',
          email: supabaseUser.email || '',
          phone: '',
          residenciaId: '',
          buildingName: '',
          hasPaymentMethod: false,
          role: 'client',
          avatarUrl: '',
          apartment: '',
          houseNumber: '',
          condominiumId: '',
          condominiumName: '',
        };
        
        console.log('AuthProvider: Using basic user data:', basicUser);
        setUser(basicUser);
        localStorage.setItem('gato_user', JSON.stringify(basicUser));
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

        console.log('AuthProvider: Setting user data:', userData);
        setUser(userData);
        localStorage.setItem('gato_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('AuthProvider: Exception loading profile:', error);
      // Still set a basic user to prevent infinite loading
      const basicUser: User = {
        id: supabaseUser.id,
        name: supabaseUser.user_metadata?.name || '',
        email: supabaseUser.email || '',
        phone: '',
        residenciaId: '',
        buildingName: '',
        hasPaymentMethod: false,
        role: 'client',
        avatarUrl: '',
        apartment: '',
        houseNumber: '',
        condominiumId: '',
        condominiumName: '',
      };
      
      console.log('AuthProvider: Exception - using basic user data:', basicUser);
      setUser(basicUser);
      localStorage.setItem('gato_user', JSON.stringify(basicUser));
    }
  };

  const login = (userData: User) => {
    console.log('AuthProvider: Manual login called with:', userData);
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
  };

  const register = (userData: User) => {
    console.log('AuthProvider: Manual register called with:', userData);
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      console.log('AuthProvider: Logging out...');
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('gato_user');
    } catch (error) {
      console.error('AuthProvider: Error signing out:', error);
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

  console.log('AuthProvider: Current state', { user: !!user, isAuthenticated: !!user, isLoading });

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
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
