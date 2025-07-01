
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRole: 'client' | 'provider';
  redirectTo?: string;
}

const RoleGuard = ({ children, allowedRole, redirectTo }: RoleGuardProps) => {
  const { isAuthenticated, user, isLoading, isLoggingOut } = useAuth();
  const location = useLocation();

  console.log('RoleGuard: Checking access -', { 
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">
            {isLoggingOut ? 'Cerrando sesión...' : 'Verificando acceso...'}
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to appropriate login (but not during logout)
  if (!isAuthenticated && !isLoggingOut) {
    const loginPath = allowedRole === 'client' ? '/client/login' : '/provider/login';
    console.log('RoleGuard: User not authenticated, redirecting to:', loginPath);
    return <Navigate to={loginPath} replace />;
  }

  // No user data - redirect to appropriate login (but not during logout)
  if (!user && !isLoggingOut) {
    const loginPath = allowedRole === 'client' ? '/client/login' : '/provider/login';
    console.log('RoleGuard: No user data, redirecting to:', loginPath);
    return <Navigate to={loginPath} replace />;
  }

  // During logout process, don't perform redirections
  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">Cerrando sesión...</p>
        </div>
      </div>
    );
  }

  // Wrong role - redirect to their correct home or specified redirect
  if (user && user.role !== allowedRole) {
    console.log('RoleGuard: Wrong role access attempt -', user.role, 'tried to access', allowedRole, 'area');
    
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    
    // Default redirects based on user's actual role
    const userHomePath = user.role === 'client' ? '/client/categories' : '/dashboard';
    console.log('RoleGuard: Redirecting to user home:', userHomePath);
    return <Navigate to={userHomePath} replace />;
  }

  console.log('RoleGuard: Access granted for role:', allowedRole);
  return <>{children}</>;
};

export default RoleGuard;
