
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

interface AuthRouteProps {
  children: React.ReactNode;
}

const AuthRoute = ({ children }: AuthRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  logger.debug('AuthRoute: State check -', { isLoading, isAuthenticated, userRole: user?.role });

  // Mostrar loading durante la verificación inicial
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
