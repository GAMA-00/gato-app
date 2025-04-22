
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  requirePaymentMethod?: boolean;
  clientOnly?: boolean; 
  providerOnly?: boolean; 
  strictAuth?: boolean; // Nuevo parámetro para indicar si la autenticación es estrictamente requerida
}

const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  requirePaymentMethod = false,
  clientOnly = false,
  providerOnly = false,
  strictAuth = false // Por defecto, no requerimos autenticación estricta
}) => {
  const { isAuthenticated, user, isLoading, isClient, isProvider } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  // Si esta es una ruta de cliente, permitir acceso sin autenticación para la mayoría de las páginas
  if (clientOnly && !providerOnly) {
    // Para páginas que no requieren estrictamente autenticación, simplemente renderizar los hijos
    return <>{children}</>;
  }

  // Para rutas de proveedor, permitir navegación sin autenticación excepto cuando strictAuth=true
  if (providerOnly) {
    // Si requiere autenticación estricta (como para crear anuncios) y no está autenticado
    if (strictAuth && !isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    // En otros casos, permitir acceso a rutas de proveedor sin autenticación
    return <>{children}</>;
  }

  // Para rutas que aún requieren autenticación
  if (!isAuthenticated && !clientOnly && strictAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si la ruta requiere un método de pago y el usuario no tiene uno
  if (requirePaymentMethod && user && !user.hasPaymentMethod) {
    return <Navigate to="/payment-setup" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
