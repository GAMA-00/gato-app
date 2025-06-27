
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import TeamSection from '@/components/team/TeamSection';
import { useIsMobile } from '@/hooks/use-mobile';

const Team: React.FC = () => {
  console.log("=== TEAM PAGE RENDER START ===");
  
  try {
    const authResult = useAuth();
    console.log("Team - Auth hook result:", authResult);
    
    const { user, isLoading } = authResult;
    const isMobile = useIsMobile();
    console.log("Team - User:", user?.id, user?.role);
    console.log("Team - Loading:", isLoading);

    // Show loading state while auth is being determined
    if (isLoading) {
      console.log("Team - Showing loading state");
      return (
        <>
          <Navbar />
          <div className="min-h-screen bg-[#FAFAFA]">
            <div className="md:ml-52 p-4 md:p-6">
              <div className="max-w-4xl mx-auto">
                <div className="min-h-screen bg-white flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-lg font-medium">Cargando información del equipo...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Redirect if no user - check this first
    if (!user) {
      console.log("Team - No user, redirecting to login");
      return <Navigate to="/login" replace />;
    }

    // Redirect if not provider - check role after confirming user exists
    if (user.role !== 'provider') {
      console.log("Team - User is not provider, redirecting to dashboard");
      return <Navigate to="/dashboard" replace />;
    }

    console.log("Team - Rendering main content");

    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#FAFAFA]">
          <div className="md:ml-52 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className={`font-bold tracking-tight text-app-text ${
                isMobile ? "text-xl mb-3" : "text-2xl md:text-3xl mb-6"
              }`}>
                Equipo
              </h1>
              <p className={`text-muted-foreground ${
                isMobile ? "text-sm mb-6" : "text-base mb-8"
              }`}>
                Gestiona los miembros de tu equipo
              </p>
              
              <div className="space-y-6">
                <TeamSection />
              </div>
            </div>
          </div>
        </div>
      </>
    );

  } catch (error) {
    console.error("Team - Error in component:", error);
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#FAFAFA]">
          <div className="md:ml-52 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="min-h-screen bg-red-50 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md mx-auto p-6">
                  <h1 className="text-2xl font-bold text-red-600">Error en página de equipo</h1>
                  <p className="text-red-500">Ha ocurrido un error inesperado. Por favor, recarga la página.</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Recargar página
                  </button>
                  {error instanceof Error && (
                    <pre className="text-xs text-left bg-red-100 p-2 rounded mt-4 overflow-auto">
                      {error.message}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
};

export default Team;
