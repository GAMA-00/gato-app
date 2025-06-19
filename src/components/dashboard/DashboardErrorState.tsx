
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  
  return (
    <>
      <Navbar />
      <div className="md:ml-52">
        <PageContainer title="Inicio" subtitle="Error al cargar">
          <Alert className="mb-6">
            <AlertDescription className="space-y-4">
              <div>
                <h4 className="font-medium text-red-800">Error al cargar las citas</h4>
                <p className="text-red-600 mt-1">
                  No se pudieron cargar tus citas. Por favor, intenta nuevamente.
                </p>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Recargar página
              </button>
            </AlertDescription>
          </Alert>
          
          {/* Show stats if available, even if appointments failed */}
          {stats && !statsError && !isLoadingStats && <DashboardStats stats={stats} />}
        </PageContainer>
      </div>
    </>
  );
};

export default DashboardErrorState;
