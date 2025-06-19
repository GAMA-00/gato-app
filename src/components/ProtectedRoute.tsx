
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
    allowedRoles 
  });

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('ProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If authenticated but no role, show error state
  if (!user?.role) {
    console.log('ProtectedRoute: User authenticated but no role');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-lg font-medium">Error de perfil</p>
          <p className="text-sm text-muted-foreground">No se pudo cargar tu perfil de usuario</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  // If user doesn't have the required role, redirect appropriately
  if (!allowedRoles.includes(user.role)) {
    const redirectTo = user.role === 'provider' ? '/dashboard' : '/client/categories';
    console.log('ProtectedRoute: User role not allowed, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // If authenticated and has correct role, show the content
  console.log('ProtectedRoute: Showing protected content');
  return <>{children}</>;
};

export default ProtectedRoute;
