
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import LoadingScreen from '@/components/common/LoadingScreen';

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
    return <LoadingScreen message="Verificando sesión..." />;
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
    const redirectTo = user.role === 'admin'
      ? '/admin/dashboard'
      : user.role === 'client' 
        ? '/client/categories' 
        : '/dashboard';
    
    logger.debug('ProtectedRoute: Redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  logger.debug('ProtectedRoute: Access granted, showing content');
  return <>{children}</>;
};

export default ProtectedRoute;
