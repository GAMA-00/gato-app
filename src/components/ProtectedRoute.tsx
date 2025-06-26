
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  console.log('ProtectedRoute: State check -', { 
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
    console.log('ProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Si no tiene usuario (caso edge), redirigir al login
  if (!user) {
    console.log('ProtectedRoute: No user data, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Verificar si el rol del usuario está permitido
  if (!allowedRoles.includes(user.role)) {
    console.log('ProtectedRoute: User role not allowed, user role:', user.role, 'allowed:', allowedRoles);
    
    // Evitar bucles de redirección verificando la ruta actual
    const currentPath = window.location.pathname;
    let redirectTo = '/dashboard';
    
    if (user.role === 'client') {
      redirectTo = '/client/categories';
    }
    
    // Si ya estamos en la ruta de destino, no redirigir (evitar bucle)
    if (currentPath === redirectTo) {
      console.log('ProtectedRoute: Already in target route, showing 403 instead of redirect');
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Acceso Denegado</h1>
            <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
          </div>
        </div>
      );
    }
    
    console.log('ProtectedRoute: Redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  console.log('ProtectedRoute: Access granted, showing content');
  return <>{children}</>;
};

export default ProtectedRoute;
