
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RequireAuthProps {
  children: React.ReactNode;
  clientOnly?: boolean; 
  providerOnly?: boolean; 
}

const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  clientOnly = false,
  providerOnly = false
}) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based routing
  if (user) {
    if (clientOnly && user.role !== 'client') {
      return <Navigate to="/dashboard" replace />;
    }
    
    if (providerOnly && user.role !== 'provider') {
      return <Navigate to="/client" replace />;
    }
  }

  return <>{children}</>;
};

export default RequireAuth;
