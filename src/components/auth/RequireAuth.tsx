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
  strictAuth = false 
}) => {
  const { isAuthenticated, user, isLoading, isClient, isProvider } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  // Strict role-based routing - if user has wrong role, redirect to appropriate page
  if (user) {
    // If user is a client but trying to access provider routes
    if (clientOnly && user.role !== 'client') {
      return <Navigate to="/dashboard" replace />;
    }
    
    // If user is a provider but trying to access client routes
    if (providerOnly && user.role !== 'provider') {
      return <Navigate to="/client" replace />;
    }
  }

  // For client-only routes that don't require strict auth
  if (clientOnly && !providerOnly && !strictAuth) {
    return <>{children}</>;
  }

  // For provider routes, check strictAuth requirement
  if (providerOnly) {
    // If strict auth required and not authenticated, redirect to login
    if (strictAuth && !isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    // Otherwise allow access
    return <>{children}</>;
  }

  // Standard auth check for other routes
  if (!isAuthenticated && strictAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check payment method requirement
  if (requirePaymentMethod && user && !user.hasPaymentMethod) {
    return <Navigate to="/payment-setup" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
