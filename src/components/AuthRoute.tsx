
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthRouteProps {
  children: React.ReactNode;
}

const AuthRoute = ({ children }: AuthRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  console.log('AuthRoute: State check -', { isLoading, isAuthenticated, userRole: user?.role });

  // Mostrar loading solo durante la verificación inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">Iniciando...</p>
        </div>
      </div>
    );
  }

  // Si está autenticado, redirigir inmediatamente según el rol
  if (isAuthenticated && user) {
    const redirectTo = user.role === 'provider' ? '/dashboard' : '/client/categories';
    console.log('AuthRoute: User authenticated, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  console.log('AuthRoute: Showing auth content');
  return <>{children}</>;
};

export default AuthRoute;
