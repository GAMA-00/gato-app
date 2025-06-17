
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

  // Initialize auth state and listen for changes
  useEffect(() => {
    console.log('=== AuthContext - Initializing ===');
    
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('=== Auth State Change ===', { event, session: !!session });
        
        if (!mounted) return;
        
        setSession(session);
        
        if (session?.user && event !== 'SIGNED_OUT') {
          console.log('Session found, loading user profile...');
          await loadUserProfile(session.user);
        } else {
          console.log('No session or signed out, clearing user data');
          setUser(null);
          localStorage.removeItem('gato_user');
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('=== Initial Session Check ===', { session: !!session });
        
        if (!mounted) return;
        
        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          // Try to load from localStorage as fallback
          const storedUser = localStorage.getItem('gato_user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              console.log('=== Loading user from localStorage ===', parsedUser);
              setUser(parsedUser);
            } catch (error) {
              console.error('Error parsing stored user:', error);
              localStorage.removeItem('gato_user');
            }
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('=== Loading user profile ===', supabaseUser.id);
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        setIsLoading(false);
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

        console.log('=== User profile loaded ===', userData);
        setUser(userData);
        localStorage.setItem('gato_user', JSON.stringify(userData));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Unexpected error loading user profile:', error);
      setIsLoading(false);
    }
  };

  // Login function
  const login = (userData: User) => {
    console.log('=== AuthContext - Login ===', userData);
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
  };

  // Register function
  const register = (userData: User) => {
    console.log('=== AuthContext - Register ===', userData);
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
  };

  // Logout function
  const logout = async () => {
    console.log('=== AuthContext - Logout ===');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      localStorage.removeItem('gato_user');
    } catch (error) {
      console.error('Error during logout:', error);
      // Clear local state even if Supabase call fails
      setUser(null);
      setSession(null);
      localStorage.removeItem('gato_user');
    }
  };
  
  // Update user payment method
  const updateUserPaymentMethod = (hasPaymentMethod: boolean) => {
    if (user) {
      const updatedUser = { ...user, hasPaymentMethod };
      console.log('=== AuthContext - Update Payment Method ===', updatedUser);
      setUser(updatedUser);
      localStorage.setItem('gato_user', JSON.stringify(updatedUser));
    }
  };

  const updateUserAvatar = (avatarUrl: string) => {
    console.log('=== AuthContext - Update Avatar ===', avatarUrl);
    
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
