
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  logger.debug('ProtectedRoute: State check -', { 
    isLoading, 
    isAuthenticated, 
    userRole: user?.role, 
    allowedRoles,
    currentPath: window.location.pathname
  });

  // Mostrar loading solo mientras se verifica la sesión inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    logger.debug('ProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Si no tiene usuario (caso edge), redirigir al login
  if (!user) {
    logger.debug('ProtectedRoute: No user data, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Verificar si el rol del usuario está permitido
  if (!allowedRoles.includes(user.role)) {
    logger.debug('ProtectedRoute: User role not allowed', { userRole: user.role, allowedRoles });
    
    // Redirigir según el rol del usuario
    const redirectTo = user.role === 'client' ? '/client/categories' : '/dashboard';
    
    logger.debug('ProtectedRoute: Redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  logger.debug('ProtectedRoute: Access granted, showing content');
  return <>{children}</>;
};

export default ProtectedRoute;
