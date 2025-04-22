
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  requirePaymentMethod?: boolean;
  clientOnly?: boolean; // Add this to indicate client-only routes
  providerOnly?: boolean; // Add this to indicate provider-only routes
}

const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  requirePaymentMethod = false,
  clientOnly = false,
  providerOnly = false 
}) => {
  const { isAuthenticated, user, isLoading, isClient, isProvider } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  // If this is a client route, allow access without authentication for most pages
  if (clientOnly && !providerOnly) {
    // For pages that don't strictly require auth, just render the children
    return <>{children}</>;
  }

  // For provider routes, require authentication
  if (providerOnly && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If provider is trying to access client-only routes or vice versa
  if (isAuthenticated) {
    if (clientOnly && !isClient) {
      return <Navigate to="/dashboard" replace />;
    }
    if (providerOnly && !isProvider) {
      return <Navigate to="/client" replace />;
    }
  }

  // For routes that still require authentication
  if (!isAuthenticated && !clientOnly) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the route requires a payment method and the user doesn't have one
  if (requirePaymentMethod && user && !user.hasPaymentMethod) {
    return <Navigate to="/payment-setup" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
