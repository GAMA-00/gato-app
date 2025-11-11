
import React, { useEffect, useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import LoadingScreen from '@/components/common/LoadingScreen';

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
          <div className="py-12">
            <LoadingScreen 
              message={`Cargando dashboard... Obteniendo tus citas de hoy y mañana (${loadingTime}s)`}
              fullScreen={false}
              size="md"
            />
            {loadingTime > 5 && (
              <p className="text-xs text-yellow-600 text-center mt-4">
                Esto está tardando más de lo normal...
              </p>
            )}
          </div>
        </PageContainer>
      </div>
    </>
  );
};

export default DashboardLoadingState;
