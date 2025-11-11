
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import LoadingScreen from '@/components/common/LoadingScreen';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRole: 'client' | 'provider';
  redirectTo?: string;
}

const RoleGuard = ({ children, allowedRole, redirectTo }: RoleGuardProps) => {
  const { isAuthenticated, user, isLoading, isLoggingOut } = useAuth();
  const location = useLocation();

  logger.debug('RoleGuard: Checking access -', { 
    isLoading, 
    isAuthenticated, 
    userRole: user?.role, 
    allowedRole,
    currentPath: location.pathname,
    isLoggingOut
  });

  // Show loading during authentication check or logout process
  if (isLoading || isLoggingOut) {
    return (
      <LoadingScreen 
        message={isLoggingOut ? 'Cerrando sesión...' : 'Verificando acceso...'}
      />
    );
  }

  // During logout process, don't perform any redirects - just show loading
  if (isLoggingOut) {
    return <LoadingScreen message="Cerrando sesión..." />;
  }

  // Not authenticated - redirect to appropriate login
  if (!isAuthenticated) {
    const loginPath = allowedRole === 'client' ? '/client/login' : '/provider/login';
    logger.debug('RoleGuard: User not authenticated, redirecting to:', loginPath);
    return <Navigate to={loginPath} replace />;
  }

  // No user data - redirect to appropriate login
  if (!user) {
    const loginPath = allowedRole === 'client' ? '/client/login' : '/provider/login';
    logger.debug('RoleGuard: No user data, redirecting to:', loginPath);
    return <Navigate to={loginPath} replace />;
  }

  // Wrong role - redirect to their correct home or specified redirect
  if (user && user.role !== allowedRole) {
    logger.debug('RoleGuard: Wrong role access attempt', { 
      userRole: user.role, 
      allowedRole, 
      attempted: 'access'
    });
    
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    
    // Default redirects based on user's actual role
    const userHomePath = user.role === 'client' ? '/client/categories' : '/dashboard';
    logger.debug('RoleGuard: Redirecting to user home:', userHomePath);
    return <Navigate to={userHomePath} replace />;
  }

  logger.debug('RoleGuard: Access granted for role:', allowedRole);
  return <>{children}</>;
};

export default RoleGuard;
