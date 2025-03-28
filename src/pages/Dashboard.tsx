
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import DashboardStats from '@/components/dashboard/DashboardStats';
import UpcomingAppointments from '@/components/dashboard/UpcomingAppointments';
import { MOCK_APPOINTMENTS, getDashboardStats } from '@/lib/data';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const stats = getDashboardStats();
  
  const handleAddAppointment = () => {
    navigate('/calendar');
  };

  return (
    <PageContainer 
      title="Inicio" 
      subtitle="Bienvenido de nuevo a ServiceSync"
      action={
        <Button onClick={handleAddAppointment}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cita
        </Button>
      }
    >
      <div className="space-y-8">
        <DashboardStats stats={stats} />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <UpcomingAppointments appointments={MOCK_APPOINTMENTS} />
          </div>
          
          <div className="lg:col-span-4">
            <div className="glassmorphism rounded-lg p-5 h-full">
              <h3 className="text-lg font-medium mb-3">Estadísticas Rápidas</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground text-sm">Servicio Más Popular</p>
                  <p className="font-medium">Limpieza Estándar de Hogar</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground text-sm">Día Más Ocupado</p>
                  <p className="font-medium">Miércoles</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground text-sm">Duración Promedio de Cita</p>
                  <p className="font-medium">90 minutos</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground text-sm">Satisfacción del Cliente</p>
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-muted">
                      <div style={{ width: "85%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"></div>
                    </div>
                    <p className="text-xs text-right mt-1">85%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
