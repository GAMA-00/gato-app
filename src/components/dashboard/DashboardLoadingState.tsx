
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';

const DashboardLoadingState: React.FC = () => {
  const [loadingTime, setLoadingTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Show emergency fallback after 10 seconds
  if (loadingTime > 10) {
    return (
      <>
        <Navbar />
        <div className="md:ml-52">
          <PageContainer title="Inicio" subtitle="Error de carga">
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="text-red-500">
                  <h3 className="text-lg font-medium">Tiempo de carga excedido</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    El dashboard está tardando más de lo esperado en cargar.
                  </p>
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  Recargar página
                </button>
              </div>
            </div>
          </PageContainer>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="md:ml-52">
        <PageContainer title="Inicio" subtitle="Cargando tu información...">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Cargando dashboard...</p>
                <p className="text-sm text-muted-foreground">
                  Obteniendo tus citas de hoy y mañana ({loadingTime}s)
                </p>
                {loadingTime > 5 && (
                  <p className="text-xs text-yellow-600">
                    Esto está tardando más de lo normal...
                  </p>
                )}
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </>
  );
};

export default DashboardLoadingState;
