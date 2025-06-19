
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthRouteProps {
  children: React.ReactNode;
}

const AuthRoute = ({ children }: AuthRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  console.log('AuthRoute: State check -', { isLoading, isAuthenticated, userRole: user?.role });

  // Mostrar loading mientras se verifica autenticación (con timeout de seguridad en AuthContext)
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
  if (isAuthenticated && user?.role) {
    const redirectTo = user.role === 'provider' ? '/dashboard' : '/client/categories';
    console.log('AuthRoute: Redirecting authenticated user to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // Si no está autenticado, mostrar el contenido (landing page, login, register)
  console.log('AuthRoute: Showing auth content');
  return <>{children}</>;
};

export default AuthRoute;
