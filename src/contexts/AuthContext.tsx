
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

  // Initialize auth state
  useEffect(() => {
    console.log('=== INITIALIZING AUTH ===');
    
    // Get current session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', session?.user?.id, error);
        
        if (session?.user && !error) {
          await loadUserProfile(session.user);
          setSession(session);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user);
          setSession(session);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('Loading user profile for:', authUser.id);
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Profile loading error:', error);
        return;
      }

      if (profile) {
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
        
        console.log('User profile loaded:', userData.id, userData.role);
        setUser(userData);
      }
    } catch (error) {
      console.error('Exception loading user profile:', error);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('=== STARTING LOGIN ===');
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('Login error:', error);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        console.log('Login successful:', data.user.id);
        // The onAuthStateChange will handle the user profile loading
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Error de autenticación' };
    } catch (error) {
      console.error('Login exception:', error);
      setIsLoading(false);
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = async () => {
    console.log('=== LOGGING OUT ===');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setSession(null);
    }
  };

  const updateUserPaymentMethod = (hasPaymentMethod: boolean) => {
    if (user) {
      setUser({ ...user, hasPaymentMethod });
    }
  };

  const updateUserAvatar = (avatarUrl: string) => {
    if (user) {
      setUser({ ...user, avatarUrl });
    }
  };

  const isAuthenticated = !!(user && session);

  console.log('AuthProvider render - user:', user?.id, 'authenticated:', isAuthenticated, 'loading:', isLoading);

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
