
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
    console.log('=== AUTH CONTEXT INITIALIZATION ===');
    
    let mounted = true;
    
    // Setup auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, !!session);
        setSession(session);
        
        if (session?.user && event !== 'SIGNED_OUT') {
          console.log('Loading user profile for:', session.user.id);
          await loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state');
          setUser(null);
          localStorage.removeItem('gato_user');
        }
        
        setIsLoading(false);
      }
    );

    // Then check for existing session
    const checkSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
          setIsLoading(false);
          return;
        }

        console.log('Initial session check:', !!initialSession);
        
        if (initialSession?.user) {
          setSession(initialSession);
          await loadUserProfile(initialSession.user);
        } else {
          // Check localStorage as fallback
          const storedUser = localStorage.getItem('gato_user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              console.log('Restored user from localStorage:', parsedUser.role);
              setUser(parsedUser);
            } catch (error) {
              console.error('Error parsing stored user:', error);
              localStorage.removeItem('gato_user');
            }
          }
        }
        
        setIsLoading(false);
        
      } catch (error) {
        console.error('Error in session check:', error);
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
      console.log('Loading profile for user:', supabaseUser.id);
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
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

        console.log('Setting user data:', { role: userData.role, name: userData.name });
        setUser(userData);
        localStorage.setItem('gato_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Exception loading user profile:', error);
    }
  };

  const login = (userData: User) => {
    console.log('Manual login:', userData.role, userData.name);
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
    setIsLoading(false);
  };

  const register = (userData: User) => {
    console.log('Manual register:', userData.role, userData.name);
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
    setIsLoading(false);
  };

  const logout = async () => {
    console.log('Logging out user');
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      localStorage.removeItem('gato_user');
    } catch (error) {
      console.error('Error during logout:', error);
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
