
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import PageContainer from '@/components/layout/PageContainer';
import TeamSection from '@/components/team/TeamSection';
import { Loader2 } from 'lucide-react';

const Team: React.FC = () => {
  console.log("=== TEAM PAGE RENDER ===");
  
  const { user, isLoading } = useAuth();

  console.log("Team - User:", user?.id, user?.role);
  console.log("Team - Loading:", isLoading);

  // Show loading state while auth is being determined
  if (isLoading) {
    console.log("Team - Showing loading state");
    return (
      <>
        <Navbar />
        <div className="md:ml-52">
          <PageContainer title="Equipo" subtitle="Cargando...">
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-lg font-medium">Cargando información del equipo...</p>
              </div>
            </div>
          </PageContainer>
        </div>
      </>
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
    <>
      <Navbar />
      <div className="md:ml-52">
        <PageContainer
          title="Equipo"
          subtitle="Gestiona los miembros de tu equipo de trabajo"
        >
          <TeamSection />
        </PageContainer>
      </div>
    </>
  );
};

export default Team;
