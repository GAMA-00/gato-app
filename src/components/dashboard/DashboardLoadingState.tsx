
import React from 'react';
import { Loader2 } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';

const DashboardLoadingState: React.FC = () => {
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
                  Obteniendo tus citas de hoy y mañana
                </p>
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </>
  );
};

export default DashboardLoadingState;
