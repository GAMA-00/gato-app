
import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // Check if there's a user in localStorage when the app loads
  useEffect(() => {
    const storedUser = localStorage.getItem('gato_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      console.log('=== AuthContext - Loading user from localStorage ===');
      console.log('Stored user:', parsedUser);
      console.log('Stored user avatarUrl:', parsedUser.avatarUrl);
      setUser(parsedUser);
    }
    setIsLoading(false);
  }, []);

  // Login function
  const login = (userData: User) => {
    console.log('=== AuthContext - Login ===');
    console.log('Login userData:', userData);
    console.log('Login userData avatarUrl:', userData.avatarUrl);
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
  };

  // Register function
  const register = (userData: User) => {
    console.log('=== AuthContext - Register ===');
    console.log('Register userData:', userData);
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('gato_user');
  };
  
  // Update user payment method
  const updateUserPaymentMethod = (hasPaymentMethod: boolean) => {
    if (user) {
      const updatedUser = { ...user, hasPaymentMethod };
      console.log('=== AuthContext - Update Payment Method ===');
      console.log('Updated user:', updatedUser);
      setUser(updatedUser);
      localStorage.setItem('gato_user', JSON.stringify(updatedUser));
    }
  };

  // Update user avatar
  const updateUserAvatar = (avatarUrl: string) => {
    console.log('=== AuthContext - Update Avatar ===');
    console.log('New avatarUrl:', avatarUrl);
    console.log('Current user before update:', user);
    
    if (user) {
      const updatedUser = { ...user, avatarUrl };
      console.log('Updated user with new avatar:', updatedUser);
      setUser(updatedUser);
      localStorage.setItem('gato_user', JSON.stringify(updatedUser));
      console.log('User and localStorage updated');
    } else {
      console.log('No user found, cannot update avatar');
    }
  };

  // Check if the user is a client, provider, or admin
  const isClient = user?.role === 'client';
  const isProvider = user?.role === 'provider';
  const isAdmin = user?.role === 'admin';

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

// Hook to use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
