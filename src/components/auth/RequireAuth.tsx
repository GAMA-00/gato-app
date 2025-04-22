
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  requirePaymentMethod?: boolean;
  clientOnly?: boolean; 
  providerOnly?: boolean; 
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

  // Modified: Allow accessing provider routes even without the provider role
  // This ensures users can navigate between views
  
  // Render the children for all authenticated users regardless of role when accessing provider routes
  if (isAuthenticated && providerOnly) {
    return <>{children}</>;
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
