
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

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
    console.log('AuthProvider: Initializing auth...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state change:', event, !!session);
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('AuthProvider: User signed out');
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in, loading profile...');
          await loadUserProfile(session.user);
        }
        
        setIsLoading(false);
      }
    );

    // Check initial session
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AuthProvider: Initial session check:', !!session);
        
        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } catch (error) {
        console.error('AuthProvider: Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkInitialSession();

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

      if (error || !profile) {
        console.log('AuthProvider: No profile found, creating basic user');
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
        
        setUser(basicUser);
        return;
      }

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

      console.log('AuthProvider: Profile loaded successfully:', userData);
      setUser(userData);
      
    } catch (error) {
      console.error('AuthProvider: Error loading profile:', error);
      // Set basic user to prevent blocking
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
      
      setUser(basicUser);
    }
  };

  const login = (userData: User) => {
    console.log('AuthProvider: Manual login:', userData);
    setUser(userData);
  };

  const register = (userData: User) => {
    console.log('AuthProvider: Manual register:', userData);
    setUser(userData);
  };

  const logout = async () => {
    try {
      console.log('AuthProvider: Logging out...');
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('AuthProvider: Error signing out:', error);
    }
  };
  
  const updateUserPaymentMethod = (hasPaymentMethod: boolean) => {
    if (user) {
      const updatedUser = { ...user, hasPaymentMethod };
      setUser(updatedUser);
    }
  };

  const updateUserAvatar = (avatarUrl: string) => {
    if (user) {
      const updatedUser = { ...user, avatarUrl };
      setUser(updatedUser);
    }
  };

  const isClient = user?.role === 'client';
  const isProvider = user?.role === 'provider';
  const isAdmin = user?.role === 'admin';

  console.log('AuthProvider: Current state - user:', !!user, 'loading:', isLoading);

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
