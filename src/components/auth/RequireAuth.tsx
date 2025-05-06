
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  roles?: string[];
  requirePaymentMethod?: boolean;
  clientOnly?: boolean; 
  providerOnly?: boolean; 
  strictAuth?: boolean;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  roles = [],
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

  // Check if user has required role when specified
  const hasRequiredRole = roles.length === 0 || (user && roles.includes(user.role));
  
  // If this is a client route, allow access without authentication for most pages
  if (clientOnly && !providerOnly) {
    return <>{children}</>;
  }

  // For provider routes, allow navigation without authentication except when strictAuth=true
  if (providerOnly) {
    if (strictAuth && !isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // For routes that still require authentication
  if (!isAuthenticated && !clientOnly && strictAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the route requires a specific role and user doesn't have it
  if (roles.length > 0 && !hasRequiredRole) {
    return <Navigate to="/" replace />;
  }

  // If the route requires a payment method and the user doesn't have one
  if (requirePaymentMethod && user && !user.hasPaymentMethod) {
    return <Navigate to="/payment-setup" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
