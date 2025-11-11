
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import LoadingScreen from '@/components/common/LoadingScreen';

interface AuthRouteProps {
  children: React.ReactNode;
}

const AuthRoute = ({ children }: AuthRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  logger.debug('AuthRoute: State check -', { isLoading, isAuthenticated, userRole: user?.role });

  // Mostrar loading durante la verificación inicial
  if (isLoading) {
    return <LoadingScreen message="Verificando sesión..." />;
  }

  // Si está autenticado, redirigir según el rol
  if (isAuthenticated && user) {
    const redirectTo = user.role === 'provider' ? '/dashboard' : '/client/categories';
    logger.debug('AuthRoute: User authenticated, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  logger.debug('AuthRoute: Showing auth content');
  return <>{children}</>;
};

export default AuthRoute;
