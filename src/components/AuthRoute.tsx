
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthRouteProps {
  children: React.ReactNode;
}

const AuthRoute = ({ children }: AuthRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  console.log('AuthRoute: State check -', { isLoading, isAuthenticated, userRole: user?.role });

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

  // Si el usuario está autenticado, redirigir inmediatamente
  // No esperar a que se cargue el perfil completo
  if (isAuthenticated) {
    // Si tenemos el rol del usuario, usar la redirección específica
    if (user?.role) {
      const redirectTo = user.role === 'provider' ? '/dashboard' : '/client/categories';
      console.log('AuthRoute: Redirecting authenticated user with role to:', redirectTo);
      return <Navigate to={redirectTo} replace />;
    } else {
      // Si no tenemos el rol, redirigir a la página de categorías como cliente por defecto
      console.log('AuthRoute: Redirecting authenticated user without role to client categories');
      return <Navigate to="/client/categories" replace />;
    }
  }

  console.log('AuthRoute: Showing auth content');
  return <>{children}</>;
};

export default AuthRoute;
