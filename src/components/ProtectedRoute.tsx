
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

  if (!isAuthenticated) {
    console.log('ProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    const redirectTo = user.role === 'provider' ? '/dashboard' : '/client/categories';
    console.log('ProtectedRoute: User role not allowed, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  console.log('ProtectedRoute: Showing protected content');
  return <>{children}</>;
};

export default ProtectedRoute;
