
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthRouteProps {
  children: React.ReactNode;
}

const AuthRoute = ({ children }: AuthRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  console.log('AuthRoute - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user role:', user?.role);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and has a role, redirect to appropriate dashboard
  if (isAuthenticated && user?.role) {
    const redirectTo = user.role === 'provider' ? '/dashboard' : '/client/categories';
    console.log('AuthRoute - Redirecting authenticated user to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // If not authenticated or no role, show the content (landing page, login, register)
  return <>{children}</>;
};

export default AuthRoute;
