
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Team: React.FC = () => {
  console.log("=== TEAM PAGE RENDER START ===");
  
  try {
    const authResult = useAuth();
    console.log("Team - Auth hook result:", authResult);
    
    const { user, isLoading } = authResult;
    console.log("Team - User:", user?.id, user?.role);
    console.log("Team - Loading:", isLoading);

    // Show loading state while auth is being determined
    if (isLoading) {
      console.log("Team - Showing loading state");
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-lg font-medium">Cargando información del equipo...</p>
          </div>
        </div>
      );
    }

    // Redirect if no user
    if (!user) {
      console.log("Team - No user, redirecting to login");
      return <Navigate to="/login" replace />;
    }

    // Redirect if not provider
    if (user.role !== 'provider') {
      console.log("Team - User is not provider, redirecting to dashboard");
      return <Navigate to="/dashboard" replace />;
    }

    console.log("Team - Rendering main content");

    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Equipo</h1>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-lg">Página de equipo funcionando correctamente</p>
            <p className="text-sm text-gray-600 mt-2">Usuario: {user.id}</p>
            <p className="text-sm text-gray-600">Rol: {user.role}</p>
          </div>
        </div>
      </div>
    );

  } catch (error) {
    console.error("Team - Error in component:", error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Error en página de equipo</h1>
          <p className="text-red-500">Ver consola para detalles</p>
          <pre className="text-xs text-left bg-red-100 p-2 rounded">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </pre>
        </div>
      </div>
    );
  }
};

export default Team;
