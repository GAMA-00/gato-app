
import React, { createContext, useContext, useState, useEffect } from 'react';

// Definimos el tipo de usuario con la información ampliada
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  buildingId: string;
  buildingName: string;
  hasPaymentMethod: boolean;
}

// Interfaz del contexto de autenticación
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  register: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Proveedor del contexto
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al cargar la app, verificar si hay un usuario en localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('gato_user');
    console.log('Stored User:', storedUser); // Agregamos este console.log para ver el contenido
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Función para iniciar sesión
  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
  };

  // Función para registrarse (similar a login por ahora)
  const register = (userData: User) => {
    setUser(userData);
    localStorage.setItem('gato_user', JSON.stringify(userData));
  };

  // Función para cerrar sesión
  const logout = () => {
    setUser(null);
    localStorage.removeItem('gato_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login, 
      register, 
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
