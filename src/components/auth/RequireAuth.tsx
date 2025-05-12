
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  requirePaymentMethod?: boolean;
  clientOnly?: boolean; 
  providerOnly?: boolean; 
  strictAuth?: boolean; // Parámetro para indicar si la autenticación es estrictamente requerida
}

const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  requirePaymentMethod = false,
  clientOnly = false,
  providerOnly = false,
  strictAuth = true // Changed default to true for more security
}) => {
  const { isAuthenticated, user, isLoading, isClient, isProvider } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  // Check authentication first if strict auth is required
  if (strictAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict role-based routing
  if (user) {
    // If this is a client-only route but user is not a client
    if (clientOnly && user.role !== 'client') {
      return <Navigate to="/dashboard" replace />;
    }
    
    // If this is a provider-only route but user is not a provider
    if (providerOnly && user.role !== 'provider') {
      return <Navigate to="/client" replace />;
    }
  }

  // Check payment method requirement
  if (requirePaymentMethod && user && !user.hasPaymentMethod) {
    return <Navigate to="/payment-setup" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
