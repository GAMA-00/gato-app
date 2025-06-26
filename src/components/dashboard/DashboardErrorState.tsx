
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import DashboardStats from '@/components/dashboard/DashboardStats';

interface DashboardErrorStateProps {
  error: any;
  stats?: any;
  statsError?: any;
  isLoadingStats?: boolean;
}

const DashboardErrorState: React.FC<DashboardErrorStateProps> = ({ 
  error, 
  stats, 
  statsError, 
  isLoadingStats 
}) => {
  console.error("Dashboard appointments error:", error);
  
  const handleRetry = () => {
    console.log("Retrying dashboard load...");
    window.location.reload();
  };
  
  return (
    <>
      <Navbar />
      <div className="md:ml-52">
        <PageContainer title="Inicio" subtitle="Error al cargar">
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="space-y-4">
              <div>
                <h4 className="font-medium text-red-800">Error al cargar las citas</h4>
                <p className="text-red-600 mt-1">
                  No se pudieron cargar tus citas. Por favor, intenta nuevamente.
                </p>
                {error?.message && (
                  <p className="text-xs text-red-500 mt-2 font-mono">
                    Error: {error.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleRetry}
                  className="bg-primary hover:bg-primary/90"
                >
                  Recargar página
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => console.log("Error details:", error)}
                >
                  Ver detalles en consola
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          
          {/* Show stats if available, even if appointments failed */}
          {stats && !statsError && !isLoadingStats && <DashboardStats stats={stats} />}
          
          {/* Show a basic fallback dashboard */}
          <div className="grid gap-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-medium mb-4">Dashboard Básico</h3>
              <p className="text-muted-foreground">
                Aunque no se pudieron cargar las citas, puedes navegar a otras secciones:
              </p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => window.location.href = '/calendar'}>
                  Ver Calendario
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/services'}>
                  Mis Servicios
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/profile'}>
                  Mi Perfil
                </Button>
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </>
  );
};

export default DashboardErrorState;
